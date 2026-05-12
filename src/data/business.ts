export const business = {
  name: "Fine Art Printing",
  legalName: "Art Framing Group Pte Ltd",
  domain: "fineartprinting.com.sg",
  contactEmail: "hello@fineartprinting.com.sg",
  // Two different numbers on purpose. Don't swap them:
  //   - phone (6971 1327) is a cloud line routed to our overseas
  //     support; use this for `tel:` links and Schema.org telephone.
  //   - whatsapp (8875 3330) is the WhatsApp Business line; use this
  //     ONLY for wa.me / WhatsApp deep links. Never as a `tel:` link
  //     because incoming voice calls to this number aren't answered.
  phone: "+65 6971 1327",
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
