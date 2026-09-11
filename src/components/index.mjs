import * as divider from "./divider.mjs";
import * as hero from "./hero.mjs";

// Each component exports render(project) and returns [{ file, svg }] for every theme.
export const components = [hero, divider];
