// Roles we always advertise. Shared by the careers page (cards + role
// dropdown) and the /api/careers endpoint (server-side validation), so the two
// never drift. Keep `value` stable — it's what the applicant submits and what
// the notification email shows.
export interface CareerRole {
  value: string;
  title: string;
  blurb: string;
}

export const CAREER_ROLES: CareerRole[] = [
  {
    value: "Delivery / Driver",
    title: "Delivery / Driver",
    blurb:
      "Careful pickup and delivery of artwork and finished pieces across Singapore. A valid licence and a steady, careful pair of hands for handling framed and fragile work.",
  },
  {
    value: "Print Specialist",
    title: "Print Specialist",
    blurb:
      "Running our fine art printers day to day: colour management, media handling, and quality control on every giclée print that leaves the studio.",
  },
  {
    value: "Workshop Assistant",
    title: "Workshop Assistant",
    blurb:
      "Supporting the workshop across mounting, packing, and general production. A great way in for someone keen to learn the craft from the ground up.",
  },
];

// Extra option so strong candidates who don't fit a listed role can still apply.
export const OPEN_APPLICATION_VALUE = "Open application";

/** Every accepted role value, for server-side validation. */
export const CAREER_ROLE_VALUES = new Set<string>([
  ...CAREER_ROLES.map((r) => r.value),
  OPEN_APPLICATION_VALUE,
]);
