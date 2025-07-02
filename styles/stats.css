# JavaScript logic for loading and injecting player data
stats_js = """
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("data/mock_player_data.json");
    const data = await response.json();

    document.getElementById("player-name").textContent = data.name || "Survivor";
    document.getElementById("player-coins").textContent = data.coins ?? 0;
    document.getElementById("cards-collected").textContent = `${data.cardsCollected} / 127`;
    document.getElementById("cards-owned").textContent = `${data.cardsOwned} / 250`;
    document.getElementById("win-loss").textContent = `${data.duelsWon} / ${data.duelsLost}`;

  } catch (err) {
    console.error("Failed to load player data:", err);
  }
});
"""

# Save to stats.js
js_path = Path("/mnt/data/sv13-player-stats-ui/scripts/stats.js")
js_path.write_text(stats_js.strip(), encoding="utf-8")
