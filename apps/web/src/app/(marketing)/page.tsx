import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { Playground } from "./components/playground";
import { DemoIndex } from "./components/demo-index";
import { QuickstartBand } from "./components/quickstart-band";
import { Footer } from "./components/footer";
import { LiveCursors } from "./components/live-cursors";

export default function MarketingPage() {
  return (
    <LiveCursors>
      <Nav />
      <Hero />
      <Playground />
      <DemoIndex />
      <QuickstartBand />
      <Footer />
    </LiveCursors>
  );
}
