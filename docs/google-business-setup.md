# Google Business Profile setup

The public Places API only returns 5 reviews per request. To pull the
full Fine Art Printing review list (e.g. all ~70 reviews) into
`/admin/featured-reviews`, we use the OAuth-authed Business Profile API.
This guide is the one-time setup.

## What you'll end up with

Five env vars in Vercel, all under the `GOOGLE_BUSINESS_*` prefix:

| Variable | Source |
|---|---|
| `GOOGLE_BUSINESS_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_BUSINESS_CLIENT_SECRET` | Google Cloud Console |
| `GOOGLE_BUSINESS_REFRESH_TOKEN` | OAuth 2.0 Playground |
| `GOOGLE_BUSINESS_ACCOUNT_ID` | Discovered via API call (see step 5) |
| `GOOGLE_BUSINESS_LOCATION_ID` | Discovered via API call (see step 5) |

Once these are set, the **"↻ Refresh from Google"** button in
`/admin/featured-reviews` will populate the full review list.

## 1. Enable the API

Open <https://console.cloud.google.com> in the Google account that owns
the Fine Art Printing Business Profile listing (or has manager access).
If you don't have a project yet, create one (e.g. `Fine Art Printing`).

In the left-hand menu: **APIs & Services → Library**. Search for and
enable:

- **My Business Account Management API**
- **My Business Business Information API**

You don't need to enable the (deprecated) "Google My Business API"
explicitly. The v4 reviews endpoint we use is enabled by default for
projects that have either of the above enabled.

## 2. Configure the consent screen (Google Auth Platform)

Google has moved the old "OAuth consent screen" page into a new
**Google Auth Platform** UI. From the left-hand menu, open it (or visit
<https://console.cloud.google.com/auth/overview>). The four tabs you
need:

**Branding**
- App name: `Fine Art Printing admin`
- User support email: your email
- Developer contact email: your email
- Authorised domain: `fineartprinting.com.sg`
- Save.

**Audience**
- User type: **External** (unless Fine Art Printing has Google
  Workspace, in which case Internal is simpler, see "Internal note" at
  the end).
- Publishing status: stay on **Testing** for now.
- Add your own Google account as a **Test user**.
- Save.

**Data Access**
- Click **Add or remove scopes**.
- In the manual entry box at the bottom, paste:
  ```
  https://www.googleapis.com/auth/business.manage
  ```
- Select it, save. You'll see a warning about sensitive scopes, fine
  for testing-mode use.

**Clients** (the next step creates one)

## 3. Create the OAuth client

Still in Google Auth Platform, open the **Clients** tab and click
**Create OAuth client** (or **+ Create credentials → OAuth client ID**
under APIs & Services → Credentials, either path works).

- Application type: **Web application**
- Name: `Fine Art Printing admin`
- Authorised redirect URIs: add `https://developers.google.com/oauthplayground`
- Create.

Copy the **Client ID** and **Client Secret** that appear. These go into
the first two env vars later.

## 4. Get the refresh token (OAuth 2.0 Playground)

Open <https://developers.google.com/oauthplayground>.

Click the cog (⚙️) in the top-right:
- Check **"Use your own OAuth credentials"**
- Paste your Client ID and Client Secret
- Close the settings.

In the left pane, scroll to **"Input your own scopes"** at the bottom of
the scope list and paste:

```
https://www.googleapis.com/auth/business.manage
```

Click **Authorise APIs**. Pick the Google account that owns the Fine
Art Printing listing. You'll see a warning ("Google hasn't verified
this app") because the app is in testing mode, click **Advanced → Go to
Fine Art Printing admin (unsafe)** to continue.

Back in the Playground, click **Exchange authorisation code for tokens**.
Copy the long **Refresh token** value. This is `GOOGLE_BUSINESS_REFRESH_TOKEN`.

**Important:** refresh tokens issued by testing-mode OAuth apps expire
after 7 days. If you want a permanent token, push the OAuth app to
**"In production"** status (Audience tab → Publish app). For a single-
user admin tool no Google verification is needed if you only authorise
yourself. If you start seeing "Refresh failed" errors in admin later,
you'll need to redo this step.

## 5. Find the Account ID and Location ID

Easiest path: use the same OAuth Playground (still open) to query the
API.

In the left pane, switch to the **HTTP method** column, choose **GET**,
and paste this in the **Request URI** box:

```
https://mybusinessaccountmanagement.googleapis.com/v1/accounts
```

Click **Send the request**. You'll get a JSON response like:

```json
{
  "accounts": [
    {
      "name": "accounts/1234567890123456789",
      "accountName": "Fine Art Printing",
      ...
    }
  ]
}
```

`GOOGLE_BUSINESS_ACCOUNT_ID` is just the number (`1234567890123456789`),
without the `accounts/` prefix.

Then list locations for that account by sending a GET to:

```
https://mybusinessbusinessinformation.googleapis.com/v1/accounts/<ACCOUNT_ID>/locations?readMask=name,title
```

Response:

```json
{
  "locations": [
    {
      "name": "locations/9876543210987654321",
      "title": "Fine Art Printing",
      ...
    }
  ]
}
```

`GOOGLE_BUSINESS_LOCATION_ID` is the number (`9876543210987654321`),
again without the `locations/` prefix.

## 6. Set the env vars in Vercel

Project settings → Environment Variables. Add all five with the values
above. Apply to Production, Preview, and Development as appropriate.

Redeploy the site so the env vars are picked up.

## 7. Test it

Open `/admin/featured-reviews`. Click **↻ Refresh from Google**. You
should see a success toast with the review count, and the "From Google"
section should now show every review on the listing.

## Troubleshooting

- **"invalid_grant"** when refreshing → the refresh token expired or was
  revoked. Redo step 4. Consider publishing the OAuth app so the token
  doesn't expire.
- **403 PERMISSION_DENIED** → the Google account that authorised doesn't
  own or manage the Fine Art Printing listing. Reauthorise with the
  right account.
- **404 NOT_FOUND** → the account or location ID is wrong, or you
  included the `accounts/` / `locations/` prefix. Strip the prefix.
- **No reviews returned** but no error → check that you're using the
  account/location IDs for the Fine Art Printing listing specifically,
  not a different business under the same account.

## Internal note (Google Workspace only)

If Fine Art Printing has Google Workspace, set the Audience tab to
**Internal**. Refresh tokens for Internal apps don't expire and there's
no verification required, which is the smoother long-term setup. If
not, stay External and either accept the 7-day expiry or publish the
app once you've verified it works.
