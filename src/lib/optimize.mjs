import { optimize } from "svgo";

const config = {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          // Animation rules must stay in <style> so the reduced-motion media query can switch them off.
          inlineStyles: false,
          removeDesc: false,
          // role="img" is not in svgo's attribute list and would be dropped.
          removeUnknownsAndDefaults: { unknownAttrs: false },
          // Sweeps and pulses rest at opacity 0 and only appear while animating.
          removeHiddenElems: { opacity0: false },
        },
      },
    },
  ],
};

export function optimizeSvg(svg) {
  return optimize(svg, config).data;
}
