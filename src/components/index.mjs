import * as divider from "./divider.mjs";
import * as hero from "./hero.mjs";
import * as stack from "./stack.mjs";
import * as terminal from "./terminal.mjs";

// Each component exports render(project) and returns [{ file, svg }] for every theme.
export const components = [hero, divider, terminal, stack];
