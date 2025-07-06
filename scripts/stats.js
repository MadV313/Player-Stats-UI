document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("id");

  if (!userId) {
    console.warn("❌ No user ID provided in URL.");
    document.getElementById("player-name").textContent = "❌ No ID provided.";
    return;
  }

  try {
    const response = await fetch(`https://duel-bot-backend-production.up.railway.app/api/userStats/${userId}`);
    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();

    document.getElementById("player-name").textContent = data.name || "Survivor";
    document.getElementById("player-coins").textContent = data.coins ?? 0;
    document.getElementById("cards-collected").textContent = `${data.cardsCollected} / 127`;
    document.getElementById("cards-owned").textContent = `${data.cardsOwned} / 250`;
    document.getElementById("win-loss").textContent = `${data.duelsWon} / ${data.duelsLost}`;
  } catch (err) {
    console.error("❌ Failed to load player data:", err);
    document.getElementById("player-name").textContent = "⚠️ Failed to load.";
  }
});
