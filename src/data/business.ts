export const business = {
  name: "Fine Art Printing",
  legalName: "Fine Art Printing Pte Ltd",
  domain: "fineartprinting.com.sg",
  contactEmail: "hello@fineartprinting.com.sg",
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
