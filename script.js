document.addEventListener("DOMContentLoaded", () => {
  const currentYear = document.querySelector("[data-current-year]");
  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  const header = document.querySelector(".header");
  const navToggle = document.querySelector(".nav-toggle");
  const primaryNav = document.querySelector("#primary-nav");
  if (header && navToggle && primaryNav) {
    const setNavOpen = (isOpen) => {
      header.classList.toggle("nav-open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
    };

    navToggle.addEventListener("click", () => {
      const isOpen = header.classList.contains("nav-open");
      setNavOpen(!isOpen);
    });

    primaryNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        setNavOpen(false);
      });
    });
  }

  const bandItems = Array.from(document.querySelectorAll(".image-band-item"));
  const bandCaption = document.querySelector("[data-band-caption-text]");
  const bandFlash = document.querySelector(".image-band-flash");
  if (bandItems.length > 0) {
    let activeIndex = 0;

    const syncBandCaption = (index) => {
      const caption = bandItems[index]?.querySelector("img")?.dataset.bandCaption;
      if (bandCaption && caption) {
        bandCaption.classList.add("is-updating");
        window.setTimeout(() => {
          bandCaption.textContent = caption;
          bandCaption.classList.remove("is-updating");
        }, 450);
      }
    };

    bandItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === activeIndex);
    });
    syncBandCaption(activeIndex);

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.setInterval(() => {
        const nextIndex = (activeIndex + 1) % bandItems.length;
        const currentItem = bandItems[activeIndex];
        const nextItem = bandItems[nextIndex];

        if (bandFlash) {
          bandFlash.classList.remove("is-flashing");
          void bandFlash.offsetWidth;
          bandFlash.classList.add("is-flashing");
          window.setTimeout(() => {
            bandFlash.classList.remove("is-flashing");
          }, 1600);
        }

        nextItem.classList.add("is-active");
        nextItem.classList.remove("is-fading-out");

        window.setTimeout(() => {
          currentItem.classList.remove("is-active");
          currentItem.classList.add("is-fading-out");
        }, 700);

        syncBandCaption(nextIndex);

        window.setTimeout(() => {
          currentItem.classList.remove("is-fading-out");
        }, 2800);

        activeIndex = nextIndex;
      }, 9600);
    }
  }

  const faqItems = Array.from(document.querySelectorAll("details.faq-item"));
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });
});
