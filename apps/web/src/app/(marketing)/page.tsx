import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { Playground } from "./components/playground";
import { Examples } from "./components/examples";
import { ApiSection } from "./components/api-section";
import { Stats } from "./components/demo-window";
import { Footer } from "./components/footer";
import { LiveCursors } from "./components/live-cursors";

export default function MarketingPage() {
  return (
    <LiveCursors>
      <Nav />
      <Hero />
      <Playground />
      <Examples />
      <ApiSection />
      <Stats />
      <Footer />
    </LiveCursors>
  );
}
