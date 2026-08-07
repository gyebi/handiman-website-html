//the hamburger menu set up
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

//you click the button and the form starts populating

const serviceButtons = document.querySelectorAll("[data-service]");
const serviceSelect = document.querySelector("#service-type");

serviceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!(serviceSelect instanceof HTMLSelectElement)) {
      return;
    }

    const selectedService = button.dataset.service;

    if (!selectedService) {
      return;
    }

    serviceSelect.value = selectedService;

    window.setTimeout(() => {
      serviceSelect.focus();
    }, 500);
  });
});

//choosing date for the wash
const preferredDateInput = document.getElementById("preferred-date");

if (preferredDateInput instanceof HTMLInputElement) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  preferredDateInput.min = `${year}-${month}-${day}`;
}

// image band rotation
const imageBand = document.querySelector(".image-band");

if (imageBand instanceof HTMLElement) {
  const bandItems = Array.from(
    imageBand.querySelectorAll(".image-band-item"),
  );
  const captionText = imageBand.querySelector(
    "[data-band-caption-text]",
  );
  const flashLayer = imageBand.querySelector(".image-band-flash");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  const rotateIntervalMs = 3500;
  let activeIndex = Math.max(
    0,
    bandItems.findIndex((item) => item.classList.contains("is-active")),
  );
  let rotationTimer = null;

  const getCaption = (item) =>
    item instanceof HTMLElement
      ? item.dataset.bandCaption || ""
      : "";

  const setCaption = (value) => {
    if (!(captionText instanceof HTMLElement)) {
      return;
    }

    captionText.classList.remove("is-updating");
    void captionText.offsetWidth;
    captionText.textContent = value;
    captionText.classList.add("is-updating");
  };

  const setActiveItem = (nextIndex) => {
    const currentItem = bandItems[activeIndex];
    const nextItem = bandItems[nextIndex];

    if (!nextItem) {
      return;
    }

    currentItem?.classList.remove("is-active");
    currentItem?.classList.add("is-fading-out");

    nextItem.classList.add("is-active");
    nextItem.classList.remove("is-fading-out");

    setCaption(getCaption(nextItem));

    if (flashLayer instanceof HTMLElement) {
      flashLayer.classList.remove("is-flashing");
      void flashLayer.offsetWidth;
      flashLayer.classList.add("is-flashing");
    }

    window.setTimeout(() => {
      currentItem?.classList.remove("is-fading-out");
    }, 900);

    activeIndex = nextIndex;
  };

  const startRotation = () => {
    if (rotationTimer || bandItems.length <= 1) {
      return;
    }

    rotationTimer = window.setInterval(() => {
      setActiveItem((activeIndex + 1) % bandItems.length);
    }, rotateIntervalMs);
  };

  const stopRotation = () => {
    if (rotationTimer) {
      window.clearInterval(rotationTimer);
      rotationTimer = null;
    }
  };

  if (reducedMotion.matches) {
    bandItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === activeIndex);
      item.classList.remove("is-fading-out");
    });
    setCaption(getCaption(bandItems[activeIndex]));
  } else {
    bandItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === activeIndex);
      item.classList.remove("is-fading-out");
    });
    setCaption(getCaption(bandItems[activeIndex]));
    startRotation();
  }

  reducedMotion.addEventListener("change", (event) => {
    stopRotation();

    bandItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === activeIndex);
      item.classList.remove("is-fading-out");
    });

    if (event.matches) {
      setCaption(getCaption(bandItems[activeIndex]));
      return;
    }

    startRotation();
  });
}

//normalisation of fone number
function normalizeGhanaMobileNumber(value) {
  if (typeof value !== "string") {
    return null;
  }

  // Keep digits and an optional leading plus sign.
  const cleaned = value.trim().replace(/[()\s-]/g, "");

  if (!cleaned) {
    return null;
  }

  let nationalNumber;

  // Local Ghana format: 0241234567
  if (/^0\d{9}$/.test(cleaned)) {
    nationalNumber = cleaned.slice(1);
  }

  // International format: +233241234567
  else if (/^\+233\d{9}$/.test(cleaned)) {
    nationalNumber = cleaned.slice(4);
  }

  // International format without plus: 233241234567
  else if (/^233\d{9}$/.test(cleaned)) {
    nationalNumber = cleaned.slice(3);
  } else {
    return null;
  }

  /*
   * Ghana mobile numbers currently use national mobile numbers
   * beginning with 2 or 5.
   *
   * This rejects fixed-line numbers because they cannot receive
   * ordinary mobile SMS.
   */
  if (!/^[25]\d{8}$/.test(nationalNumber)) {
    return null;
  }

  return `+233${nationalNumber}`;
}

const requestForm = document.querySelector("#detailing-request-form");
const formStatus = document.querySelector("#form-status");

const HANDIMAN_API_BASE_URL = "https://ai-handiman--handimanautocare.us-east4.hosted.app";

//const HANDIMAN_API_BASE_URL = "http://localhost:3000";

function getOptionalFormValue(formData, fieldName) {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue || undefined;
}

function getErrorMessage(result, fallbackMessage) {
  if (
    result &&
    typeof result === "object" &&
    typeof result.error === "string"
  ) {
    return result.error;
  }

  return fallbackMessage;
}

if (
  requestForm instanceof HTMLFormElement &&
  formStatus instanceof HTMLElement
) {
  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!requestForm.checkValidity()) {
      requestForm.reportValidity();
      return;
    }

    const submitButton = requestForm.querySelector(
      'button[type="submit"]',
    );

    const formData = new FormData(requestForm);

    const requestData = {
      customerName: getOptionalFormValue(
        formData,
        "customerName",
      ),
      customerPhone: getOptionalFormValue(
        formData,
        "customerPhone",
      ),
      customerEmail: getOptionalFormValue(
        formData,
        "customerEmail",
      ),
      serviceType: getOptionalFormValue(
        formData,
        "serviceType",
      ),
      vehicleType: getOptionalFormValue(
        formData,
        "vehicleType",
      ),
      vehicleDetails: getOptionalFormValue(
        formData,
        "vehicleDetails",
      ),
      serviceLocation: getOptionalFormValue(
        formData,
        "serviceLocation",
      ),
      preferredDate: getOptionalFormValue(
        formData,
        "preferredDate",
      ),
      preferredTime: getOptionalFormValue(
        formData,
        "preferredTime",
      ),
      requestNotes: getOptionalFormValue(
        formData,
        "requestNotes",
      ),
    };

    formStatus.textContent = "Submitting your request...";
    formStatus.setAttribute("role", "status");

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const response = await fetch(
        `${HANDIMAN_API_BASE_URL}/api/public/detailing-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
          signal: controller.signal,
        },
      );

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The server returned an unreadable response.",
        );
      }

      if (!response.ok || result.ok !== true) {
        throw new Error(
          getErrorMessage(
            result,
            "Your request could not be submitted.",
          ),
        );
      }

      const requestNumber = result.request?.requestNumber;

      formStatus.textContent = requestNumber
        ? `Request received successfully. Your request number is ${requestNumber}.`
        : "Request received successfully.";

      requestForm.reset();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        formStatus.textContent =
          "The request took too long. Please check your connection and try again.";
      } else {
        formStatus.textContent =
          error instanceof Error
            ? error.message
            : "Your request could not be submitted. Please try again.";
      }
    } finally {
      window.clearTimeout(timeoutId);

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  });
}

function getRequiredText(formData, fieldName) {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    throw new Error(`The ${fieldName} field is required.`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`The ${fieldName} field is required.`);
  }

  return normalizedValue;
}

function getOptionalText(formData, fieldName) {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

async function submitDetailingRequest(requestData) {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response = await fetch("/api/detailing-requests", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify(requestData),

      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";

    let responseBody = null;

    if (contentType.includes("application/json")) {
      responseBody = await response.json();
    }

    if (!response.ok) {
      const errorMessage =
        responseBody?.message ||
        "Handiman could not process your request. Please try again.";

      throw new Error(errorMessage);
    }

    if (
      !responseBody ||
      responseBody.success !== true ||
      typeof responseBody.requestNumber !== "string"
    ) {
      throw new Error(
        "The server returned an unexpected response. Please contact Handiman.",
      );
    }

    return responseBody;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "The request took too long. Please check your connection and try again.",
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        "We could not reach Handiman. Please check your connection and try again.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
