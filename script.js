const menuButton = document.getElementById("nav-toggle");
const navigation = document.getElementById("primary-nav");
const header = document.querySelector(".header");

if (menuButton && navigation && header) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";

    menuButton.setAttribute("aria-expanded", String(!isOpen));
    header.classList.toggle("nav-open", !isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLAnchorElement)) {
      return;
    }

    menuButton.setAttribute("aria-expanded", "false");
    header.classList.remove("nav-open");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      menuButton.setAttribute("aria-expanded", "false");
      header.classList.remove("nav-open");
      menuButton.focus();
    }
  });
}



