const STORAGE_KEY = "disabledDomains";

async function isEnabled(domain) {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const disabledDomains = result[STORAGE_KEY] || [];

  return !disabledDomains.includes(domain);
}

async function toggleDomain(domain) {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const disabledDomains = result[STORAGE_KEY] || [];

  const currentlyEnabled = !disabledDomains.includes(domain);

  let nextDisabledDomains;

  if (currentlyEnabled) {
    nextDisabledDomains = [
      ...disabledDomains,
      domain
    ];
  } else {
    nextDisabledDomains = disabledDomains.filter(
      item => item !== domain
    );
  }

  await browser.storage.local.set({
    [STORAGE_KEY]: nextDisabledDomains
  });

  return !currentlyEnabled;
}

async function updateAction(tabId, enabled) {
  await browser.action.setTitle({
    tabId,
    title: enabled
      ? "Theme invert: ON"
      : "Theme invert: OFF"
  });
  
  await browser.action.setIcon({
    tabId,
    path: enabled ? "icons/on.svg" : "icons/off.svg",
  });
}

async function updateTabsForDomain(domain, enabled) {
  const tabs = await browser.tabs.query({});

  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || !tab.url) {
        return;
      }

      try {
        const url = new URL(tab.url);

        if (url.hostname !== domain) {
          return;
        }

        await browser.tabs.sendMessage(tab.id, {
          type: "setEnabled",
          enabled
        });

        await updateAction(tab.id, enabled);
      } catch {
        console.log('Tab not found');
        
      }
    })
  );
}

browser.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) {
    return;
  }

  let url;

  try {
    url = new URL(tab.url);
  } catch {
    return;
  }

  if (!url.hostname) {
    return;
  }

  const domain = url.hostname;
  const enabled = await toggleDomain(domain);

  try {
    await updateTabsForDomain(
      url.hostname,
      enabled
    );
  } catch {
    console.log("Content script unavailable.")
  }
});

browser.runtime.onMessage.addListener(async (message) => {
  if (message.type !== "getEnabled") {
    return;
  }

  return {
    enabled: await isEnabled(message.domain)
  };
});

browser.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await browser.tabs.get(tabId);

    if (!tab.url) {
      return;
    }

    const url = new URL(tab.url);

    if (!url.hostname) {
      return;
    }

    const enabled = await isEnabled(url.hostname);

    await updateAction(tabId, enabled);
  } catch {
    console.log('Tab not found')
  }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading" || !tab.url) {
    return;
  }

  try {
    const url = new URL(tab.url);

    if (!url.hostname) {
      return;
    }

    const enabled = await isEnabled(url.hostname);

    await updateAction(tabId, enabled);
  } catch {
    console.log('Invalid url');
  }
});