/**
 * Constrain a measurement input to at most one decimal place. Customers
 * were able to enter 50.55555 etc., which round-tripped into pricing
 * computations as noisy values. Round on `blur` rather than `input` so
 * we don't fight the user mid-typing.
 *
 * Pass `step = 1` to snap to integers (e.g. wall dimensions in cm).
 */
export function attachDecimalSnap(
  input: HTMLInputElement,
  options: { step?: 0.1 | 1; onChange?: () => void } = {},
): void {
  const step = options.step ?? 0.1;
  const factor = step === 1 ? 1 : 10;
  const snap = () => {
    const v = parseFloat(input.value);
    if (!Number.isFinite(v)) return;
    const snapped = Math.round(v * factor) / factor;
    if (snapped !== v) {
      input.value = step === 1 ? String(snapped) : snapped.toFixed(1);
      options.onChange?.();
    }
  };
  input.addEventListener("blur", snap);
  // Also snap on Enter so users hitting return get the cleaned value.
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") snap();
  });
}
