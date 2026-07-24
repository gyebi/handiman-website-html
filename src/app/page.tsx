import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CarFront, Clock3, MapPinned, Phone, Sparkles, Star, Wrench } from "lucide-react";
import { brandAssets } from "@/frontend/lib/brand-assets";
import styles from "./page.module.css";

const locationStats = [
  { label: "Service type", value: "Mobile car detailing" },
  { label: "Coverage", value: "Local service area" },
  { label: "Booking", value: "Quote-based request" },
] as const;

const featuredServices = [
  {
    title: "Interior Detail",
    description: "Cabin refresh for seats, carpets, touchpoints, and glass.",
  },
  {
    title: "Exterior Detail",
    description: "Hand wash, wheels, drying, and a polished finish outside.",
  },
  {
    title: "Full Detail",
    description: "A complete inside-and-out service for a full reset.",
  },
] as const;

const storeHighlights = [
  "Convenient customer location coordination",
  "Clear request flow for detail type and vehicle info",
  "Flexible service planning around access and setup",
  "Simple, local-first marketing experience",
] as const;

const faqs = [
  "What information do I need to request service?",
  "Can I choose my location?",
  "Do you offer interior, exterior, and full detail options?",
  "Is this page for bookings or a quote request?",
] as const;

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <header className={styles.header}>
          <Link className={styles.brand} href="/" aria-label="Handiman home">
            <Image
              src={brandAssets.splashLogo}
              alt=""
              width={1708}
              height={444}
              priority
              className={styles.logo}
            />
          </Link>

          <nav className={styles.nav} aria-label="Primary">
            <a href="#services">Services</a>
            <a href="#location">Location</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className={styles.headerActions}>
            <a className={styles.headerLink} href="tel:0000000000">
              <Phone aria-hidden="true" size={16} />
              Call
            </a>
            <a className={styles.headerCta} href="#request">
              Request Quote
            </a>
          </div>
        </header>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>Mobile car detailing in your area</p>
            <h1 id="hero-title">Bold, convenient car detailing built for local customers.</h1>
            <p className={styles.heroDescription}>
              Handiman is launching as a marketing-first experience for customers who want a simple way to request
              interior, exterior, or full detailing from a location that works for them.
            </p>

            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#request">
                Request Car Detailing <ArrowRight aria-hidden="true" size={18} />
              </a>
              <a className={styles.secondaryButton} href="#services">
                View Services
              </a>
            </div>

            <div className={styles.locationStrip}>
              {locationStats.map((stat) => (
                <div className={styles.statCard} key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroVisualBackdrop} />
            <Image
              alt="Handiman brand visual for mobile car detailing"
              className={styles.heroImage}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 44vw"
              src="/assets/handiman_icon_centered_enlarged.png"
            />
            <div className={styles.heroCard}>
              <div className={styles.heroCardRow}>
                <BadgeCheck aria-hidden="true" size={18} />
                <strong>Location-first marketing page</strong>
              </div>
              <p>Simple sections, clear CTAs, and a layout that works cleanly from mobile to desktop.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="request" className={styles.splitSection}>
        <div className={styles.requestCard}>
          <SectionHeading
            eyebrow="Quick request"
            title="Start with a simple quote request"
            description="Tell us what kind of detail you need, where the vehicle is located, and a preferred time window."
          />

          <ul className={styles.checklist}>
            <li>Interior, exterior, or full detail</li>
            <li>Vehicle make, model, and year</li>
            <li>ZIP code or service location</li>
            <li>Preferred day or time window</li>
          </ul>
        </div>

        <aside className={styles.contactCard}>
          <p className={styles.eyebrow}>Contact</p>
          <h3>Fast actions for customers</h3>
          <a className={styles.contactButton} href="tel:0000000000">
            <Phone aria-hidden="true" size={16} />
            Call for a Quote
          </a>
          <a className={styles.contactButtonAlt} href="#faq">
            Read the FAQ
          </a>
        </aside>
      </section>

      <section id="services" className={styles.section}>
        <SectionHeading
          eyebrow="Services"
          title="Choose the detail that fits the job"
          description="The page stays focused on the core service offering instead of overwhelming visitors with app-style complexity."
        />

        <div className={styles.serviceGrid}>
          {featuredServices.map((service) => (
            <article className={styles.serviceCard} key={service.title}>
              <div className={styles.serviceIcon}>
                <CarFront aria-hidden="true" size={22} />
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <a className={styles.cardButton} href="#request">
                Request this service
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="location" className={styles.section}>
        <SectionHeading
          eyebrow="Location"
          title="Built around convenience and local service"
          description="This structure gives the site a store-page feel while still staying true to Handiman's bold color system."
        />

        <div className={styles.locationGrid}>
          <div className={styles.infoCard}>
            <MapPinned aria-hidden="true" size={22} />
            <h3>Service area</h3>
            <p>Designed for customers who want service at home, work, or another agreed location.</p>
          </div>
          <div className={styles.infoCard}>
            <Clock3 aria-hidden="true" size={22} />
            <h3>Flexible scheduling</h3>
            <p>Requests can be handled around availability, access, and setup needs.</p>
          </div>
          <div className={styles.infoCard}>
            <Sparkles aria-hidden="true" size={22} />
            <h3>Clean presentation</h3>
            <p>Strong hierarchy, simple copy, and clear CTA placement across screen sizes.</p>
          </div>
          <div className={styles.infoCard}>
            <Wrench aria-hidden="true" size={22} />
            <h3>Practical setup</h3>
            <p>We keep the page lean so the heavy app workflows can live elsewhere.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.section}>
        <SectionHeading
          eyebrow="How it works"
          title="A simple request flow"
          description="The process is intentionally short so visitors understand the next step right away."
        />

        <ol className={styles.steps}>
          <li>
            <strong>Choose a service</strong>
            <span>Select the detailing option that matches the vehicle&apos;s needs.</span>
          </li>
          <li>
            <strong>Share your details</strong>
            <span>Add vehicle info, service location, and timing preferences.</span>
          </li>
          <li>
            <strong>Get a response</strong>
            <span>Handiman can review the request and coordinate next steps.</span>
          </li>
          <li>
            <strong>Complete the detail</strong>
            <span>Service happens at the agreed location with a straightforward handoff.</span>
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <SectionHeading
          eyebrow="Why Handiman"
          title="Bold colors, clear structure, local feel"
          description="This keeps the visual identity strong while adapting the page to a marketing-first purpose."
        />

        <div className={styles.benefitGrid}>
          {storeHighlights.map((item) => (
            <div className={styles.benefitCard} key={item}>
              <Star aria-hidden="true" size={18} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className={styles.section}>
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="Short answers keep the marketing site clear and easy to scan."
        />

        <div className={styles.faqList}>
          {faqs.map((question) => (
            <details className={styles.faqItem} key={question}>
              <summary>{question}</summary>
              <p>
                This is a marketing page designed to capture interest and guide customers toward the right next step
                for Handiman&apos;s detailing service.
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.eyebrow}>Ready to book?</p>
          <h2>Request professional car detailing with a site experience that feels local, bold, and easy to use.</h2>
        </div>
        <div className={styles.finalActions}>
          <a className={styles.primaryButton} href="#request">
            Request Car Detailing
          </a>
          <a className={styles.secondaryButton} href="#services">
            Explore Services
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <Image src={brandAssets.icon} alt="" width={166} height={164} className={styles.footerMark} />
        <p>Handiman is focused on car detailing as the primary marketing service.</p>
      </footer>
    </main>
  );
}
