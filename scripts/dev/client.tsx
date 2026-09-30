import { createRoot } from "react-dom/client";
import { Playground } from "./playground.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("The playground is unavailable.");
createRoot(root).render(<Playground />);
