/**
 * Picture frame profiles stocked by the studio.
 *
 * Single source of truth — the marketing /custom-framing page renders the
 * groups, and the admin form's "Picture frame" dropdown reads the flat
 * list. If a profile is added/removed, do it here.
 */

export interface PictureFrameProfile {
  /** Stable id used as the foreign key in frame_examples.picture_frame_id. */
  id: string;
  /** Customer-facing label including the dimension (e.g. "2cm Smooth Black"). */
  label: string;
  /** Filename in /public/photos/picture-frames/ */
  image: string;
}

export interface PictureFrameGroup {
  heading: string;
  intro: string;
  profiles: PictureFrameProfile[];
}

export const PICTURE_FRAME_GROUPS: PictureFrameGroup[] = [
  {
    heading: "Black",
    intro:
      "Versatile, gallery-neutral, the safe default for most photography and graphic work.",
    profiles: [
      { id: "1.5cm-smooth-black", label: "1.5cm Smooth Black", image: "1.5cm-smooth-black.jpg" },
      { id: "2cm-smooth-black", label: "2cm Smooth Black", image: "2030-B.jpg" },
      { id: "2.2cm-wood-grain-black", label: "2.2cm Wood Grain Black", image: "Q2238-B.jpg" },
      { id: "3cm-smooth-black", label: "3cm Smooth Black", image: "5030-B.jpg" },
    ],
  },
  {
    heading: "White",
    intro:
      "Soft, contemporary, a clean surround that lets the work speak.",
    profiles: [
      { id: "1.5cm-smooth-white", label: "1.5cm Smooth White", image: "1.5cm-smooth-white.jpg" },
      { id: "2cm-smooth-white", label: "2cm Smooth White", image: "2030-W.jpg" },
      { id: "2.2cm-wood-grain-white", label: "2.2cm Wood Grain White", image: "Q2238-W.jpg" },
      { id: "3cm-smooth-white", label: "3cm Smooth White", image: "5030-W.jpg" },
    ],
  },
  {
    heading: "Natural Line",
    intro: "Natural-finish profiles for warmer, lived-in spaces.",
    profiles: [
      { id: "natural-pine", label: "2.2cm Natural Pine", image: "Q2238-NW.jpg" },
      { id: "raw-oak", label: "2cm Raw Oak", image: "KF238-STE.jpg" },
      { id: "smooth-oak", label: "2cm Smooth Oak", image: "K332-STE.jpg" },
    ],
  },
  {
    heading: "Decorative",
    intro:
      "For classical work, certificates, and pieces that earn a more formal surround.",
    profiles: [
      { id: "classic-gold", label: "2.5cm Classic Gold", image: "2628-G.jpg" },
      { id: "classic-champagne", label: "2.5cm Classic Champagne", image: "2828-S.jpg" },
      { id: "metallic-silver", label: "2cm Metallic Silver", image: "KF238-S-1.jpg" },
      { id: "black-gold-inlet", label: "2cm Black, Gold Inlet", image: "120-BL-G.jpg" },
    ],
  },
];

export const PICTURE_FRAMES: PictureFrameProfile[] = PICTURE_FRAME_GROUPS.flatMap(
  (g) => g.profiles,
);
