export const business = {
  name: "Fine Art Printing",
  legalName: "Art Framing Group Pte Ltd",
  domain: "fineartprinting.com.sg",
  contactEmail: "hello@fineartprinting.com.sg",
  // Single contact number for both voice calls and WhatsApp: the
  // WhatsApp Business line (8875 3330) now answers incoming calls too,
  // so we retired the old separate cloud line (6971 1327).
  //   - phone: used for `tel:` links and Schema.org telephone.
  //   - whatsapp / whatsappLink: used for wa.me / WhatsApp deep links.
  // Keep all three in sync on the same number.
  phone: "+65 8875 3330",
  whatsapp: "+65 8875 3330",
  whatsappLink: "https://wa.me/6588753330",
  address: {
    line1: "Cendex Centre",
    line2: "120 Lower Delta Road",
    line3: "#08-01/02",
    postcode: "Singapore 169208",
  },
  hours: [
    { day: "Mon - Fri", time: "10am - 6pm" },
    { day: "Saturday", time: "10am - 5pm" },
    { day: "Sun & PH", time: "Closed" },
  ],
  placeId: "ChIJke7_b1gZ2jERBZIUs8hiUJE",
  googleReviewsUrl:
    "https://search.google.com/local/reviews?placeid=ChIJke7_b1gZ2jERBZIUs8hiUJE",
  youtubeVideoId: "y6ADB2xVLWM", // Canon feature
} as const;
