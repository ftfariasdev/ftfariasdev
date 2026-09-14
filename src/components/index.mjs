import * as connect from "./connect.mjs";
import * as divider from "./divider.mjs";
import * as footer from "./footer.mjs";
import * as hero from "./hero.mjs";
import * as projects from "./projects.mjs";
import * as stack from "./stack.mjs";
import * as terminal from "./terminal.mjs";
import * as vuMeter from "./vu-meter.mjs";

// Each component exports render(project) and returns [{ file, svg }] for every theme.
export const components = [hero, divider, terminal, stack, projects, connect, vuMeter, footer];
