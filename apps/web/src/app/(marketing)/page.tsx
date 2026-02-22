import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { Features } from "./components/features";
import { ApiSection } from "./components/api-section";
import { Stats } from "./components/demo-window";
import { Footer } from "./components/footer";

export default function MarketingPage() {
  return (
    <>
      <Nav />
      <Hero />
      <Features />
      <ApiSection />
      <Stats />
      <Footer />
    </>
  );
}
