# Google Business Profile setup

The public Places API only returns 5 reviews per request. To pull the
full list of reviews (e.g. all ~70 of ours) into `/admin/featured-reviews`,
we use the OAuth-authed Business Profile API. This guide is the one-time
setup.

## What you'll end up with

Five env vars in Vercel, all under the `GOOGLE_BUSINESS_*` prefix:

| Variable | Source |
|---|---|
| `GOOGLE_BUSINESS_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_BUSINESS_CLIENT_SECRET` | Google Cloud Console |
| `GOOGLE_BUSINESS_REFRESH_TOKEN` | OAuth 2.0 Playground |
| `GOOGLE_BUSINESS_ACCOUNT_ID` | Business Profile dashboard or API call |
| `GOOGLE_BUSINESS_LOCATION_ID` | Business Profile dashboard or API call |

Once these are set, the **"↻ Refresh from Google"** button in
`/admin/featured-reviews` will populate the full review list.

## 1. Enable the API

Open <https://console.cloud.google.com> in the Google account that owns
the JCP listing (or that has been granted manager access). If you don't
have a project yet, create one (e.g. "Fine Art Printing").

In the left-hand menu: **APIs & Services → Library**. Search for and
enable:

- **My Business Account Management API**
- **My Business Business Information API**

You don't need to enable the (deprecated) "Google My Business API"
explicitly — the v4 reviews endpoint we use is enabled by default for
projects that have either of the above enabled.

## 2. Configure the OAuth consent screen

**APIs & Services → OAuth consent screen.**

Choose **External** user type (unless you have Google Workspace, in
which case **Internal** is simpler — see "Internal note" at the end).

Fill in:

- App name: `Fine Art Printing admin`
- User support email: your email
- Developer contact: your email
- Authorized domains: `fineartprinting.com.sg`
- Save

On the **Scopes** step, click "Add or remove scopes" and add:

```
https://www.googleapis.com/auth/business.manage
```

This is a sensitive scope, but for a single-user admin tool you don't
need to submit for Google's verification process. Stay in **Testing**
mode and add your own Google account as a "Test user" on the next step.

Save. You'll see a warning about sensitive scopes — that's fine for
testing-mode use.

## 3. Create OAuth credentials

**APIs & Services → Credentials → + Create Credentials → OAuth client ID.**

- Application type: **Web application**
- Name: `Fine Art Printing admin`
- Authorized redirect URIs: add `https://developers.google.com/oauthplayground`

Click Create. Copy the **Client ID** and **Client Secret**. You'll set
these as Vercel env vars in a moment.

## 4. Get the refresh token (OAuth 2.0 Playground)

Open <https://developers.google.com/oauthplayground>.

In the top-right cog (⚙️) icon:

- Check **"Use your own OAuth credentials"**
- Paste your Client ID and Client Secret
- Close the settings

In the left pane, scroll to the **"Input your own scopes"** box at the
bottom of the scope list and paste:

```
https://www.googleapis.com/auth/business.manage
```

Click **Authorize APIs**. You'll see Google's account picker — choose
the Google account that owns the JCP listing. Approve the consent
screen (you may need to click "Advanced → Go to ... (unsafe)" because
the app is in testing mode; that's expected).

Back in the Playground, click **Exchange authorization code for tokens**.
Copy the long **Refresh token** value. This is what goes into
`GOOGLE_BUSINESS_REFRESH_TOKEN`.

**Important:** refresh tokens issued by testing-mode OAuth apps expire
after 7 days. If you want a permanent token, push the OAuth app to
"In production" status (no verification needed for our use case if you
only authorise yourself). If you start seeing "Refresh failed" errors in
admin, you'll need to redo this step.

## 5. Find the Account ID and Location ID

Easiest path: use the OAuth Playground (still open) to query the API.

In the **"List APIs by"** dropdown at the bottom-left, type:
`https://mybusinessaccountmanagement.googleapis.com/v1/accounts`

Click the **GET** request button (or paste it as a custom URI request).
You'll get a JSON response like:

```json
{
  "accounts": [
    {
      "name": "accounts/1234567890123456789",
      "accountName": "JCP Law",
      ...
    }
  ]
}
```

`GOOGLE_BUSINESS_ACCOUNT_ID` is just the number (`1234567890123456789`),
without the `accounts/` prefix.

Then list locations for that account:
`https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{accountId}/locations?readMask=name,title`

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

Redeploy the site (or just trigger a build) so the env vars are picked
up.

## 7. Test it

Open `/admin/featured-reviews`. Click **↻ Refresh from Google**. You
should see a success toast with the review count, and the "From Google"
section should now show every review on the listing.

## Troubleshooting

- **"invalid_grant"** when refreshing → the refresh token expired or was
  revoked. Redo step 4. Consider pushing the OAuth app to production
  status so the token doesn't expire.
- **403 PERMISSION_DENIED** → the Google account that authorised doesn't
  own or manage the listing. Reauthorise with the right account.
- **404 NOT_FOUND** → the account or location ID is wrong, or formatted
  with the `accounts/` / `locations/` prefix. Strip the prefix.
- **No reviews returned** but no error → check that you're using the
  account/location IDs for the JCP listing specifically and not a
  different business under the same account.

## Internal note (Google Workspace only)

If JCP has Google Workspace, the OAuth consent screen can be set to
**Internal** user type. Refresh tokens for Internal apps don't expire,
and there's no verification required. This is the recommended setup if
you have Workspace.
