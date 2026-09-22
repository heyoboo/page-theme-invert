const CLASS_NAME = "ext-css";

function setEnabled(enabled) {
  document.documentElement.classList.toggle(
    CLASS_NAME,
    enabled
  );
}

async function initialize() {
  const domain = location.hostname;

  if (!domain) {
    return;
  }

  try {
    const result = await browser.runtime.sendMessage({
      type: "getEnabled",
      domain
    });

    setEnabled(result.enabled);
  } catch {
    setEnabled(false);
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "setEnabled") {
    setEnabled(message.enabled);
  }
});

initialize();