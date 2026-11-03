// ===== Constantes et formats =====
const CATEGORIES = ["Smartphones", "Accessoires", "Informatique", "Téléviseurs", "Audio"];
const PALETTE = ["#2b1c5a", "#4a338f", "#6b54b6", "#907ad6", "#c4b5fd"];
const ACCENT = "#f4a98c"; // couleur pêche de la 2e courbe
const AVATAR_COLORS = ["#6b54b6", "#f4a98c", "#4a338f", "#907ad6", "#2f6fed"];

const fmtEUR0 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtEUR2 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNumber = new Intl.NumberFormat("fr-FR");

// ===== Thème global Chart.js (style "Medical App") =====
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = "#827f98";

const tooltipStyle = {
  backgroundColor: "#2b1c5a",
  titleColor: "#ffffff",
  bodyColor: "#e9e4ff",
  titleFont: { family: "'Inter', sans-serif", size: 13, weight: "600" },
  bodyFont: { family: "'Inter', sans-serif", size: 13 },
  padding: 14,
  cornerRadius: 12,
  displayColors: false,
  boxPadding: 4
};

const gridStyle = { color: "#eef0f6", drawTicks: false };

// ===== Chargement unique des données =====
fetch("sales.json")
  .then(response => {
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  })
  .then(data => {

    // --- Éléments du DOM ---
    const tableBody = document.getElementById("table-body");
    const resultsCount = document.getElementById("results-count");
    const searchInput = document.getElementById("search-input");
    const categoryFilter = document.getElementById("category-filter");
    const priceSort = document.getElementById("price-sort");
    const resetBtn = document.getElementById("reset-btn");
    const recentList = document.getElementById("recent-list");
    const recentCount = document.getElementById("recent-count");

    // Liste des mois (calculée une seule fois pour garder un axe stable)
    const moisCles = [...new Set(data.map(item => item.date.slice(0, 7)))].sort();
    const moisLabels = moisCles.map(cle =>
      new Date(cle + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
    );

    // --- GESTION DES KPIs ---
    function afficherKPI(donnees) {
      let totalQuantity = 0;
      let totalCA = 0;

      donnees.forEach(item => {
        totalQuantity += item.quantity;
        totalCA += item.price * item.quantity;
      });

      // Prix moyen par unité vendue = CA / quantité totale
      const prixMoyen = totalQuantity > 0 ? totalCA / totalQuantity : 0;

      document.getElementById("kpi-sales-count").textContent = fmtNumber.format(donnees.length);
      document.getElementById("kpi-total-quantity").textContent = fmtNumber.format(totalQuantity);
      document.getElementById("kpi-average-price").textContent = fmtEUR2.format(prixMoyen);
      document.getElementById("kpi-total-ca").textContent = fmtEUR0.format(totalCA);
    }

    // --- CALCULS POUR LES GRAPHIQUES ---
    function caParCategorie(donnees) {
      return CATEGORIES.map(cat =>
        donnees.filter(i => i.category === cat).reduce((s, i) => s + i.price * i.quantity, 0)
      );
    }

    function qteParCategorie(donnees) {
      return CATEGORIES.map(cat =>
        donnees.filter(i => i.category === cat).reduce((s, i) => s + i.quantity, 0)
      );
    }

    function caParMois(donnees) {
      return moisCles.map(cle =>
        donnees.filter(i => i.date.startsWith(cle)).reduce((s, i) => s + i.price * i.quantity, 0)
      );
    }

    function qteParMois(donnees) {
      return moisCles.map(cle =>
        donnees.filter(i => i.date.startsWith(cle)).reduce((s, i) => s + i.quantity, 0)
      );
    }

    // --- GRAPHIQUE 1 : CA PAR CATÉGORIE (BARRES) ---
    const barChart = new Chart(document.getElementById("category-chart").getContext("2d"), {
      type: "bar",
      data: {
        labels: CATEGORIES,
        datasets: [{
          label: "Chiffre d'affaires",
          data: caParCategorie(data),
          backgroundColor: PALETTE,
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 64
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipStyle,
            callbacks: { label: ctx => " " + fmtEUR0.format(ctx.parsed.y) }
          }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: {
            beginAtZero: true,
            grid: gridStyle,
            border: { display: false },
            ticks: { padding: 10, callback: v => fmtEUR0.format(v) }
          }
        }
      }
    });

    // --- GRAPHIQUE 2 : CA + QUANTITÉS (2 COURBES) ---
    const lineChart = new Chart(document.getElementById("line-chart").getContext("2d"), {
      type: "line",
      data: {
        labels: moisLabels,
        datasets: [
          {
            label: "Chiffre d'affaires",
            data: caParMois(data),
            yAxisID: "y",
            borderColor: "#4a338f",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            backgroundColor: context => {
              const { chart } = context;
              if (!chart.chartArea) return "rgba(74, 51, 143, 0.1)";
              const gradient = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
              gradient.addColorStop(0, "rgba(74, 51, 143, 0.22)");
              gradient.addColorStop(1, "rgba(74, 51, 143, 0)");
              return gradient;
            },
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#ffffff",
            pointHoverBorderColor: "#4a338f",
            pointHoverBorderWidth: 2
          },
          {
            label: "Quantités vendues",
            data: qteParMois(data),
            yAxisID: "y1",
            borderColor: ACCENT,
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#ffffff",
            pointHoverBorderColor: ACCENT,
            pointHoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, pointStyle: "circle", padding: 18, boxWidth: 8 }
          },
          tooltip: {
            ...tooltipStyle,
            displayColors: true,
            callbacks: {
              label: ctx => ctx.dataset.yAxisID === "y1"
                ? ` ${fmtNumber.format(ctx.parsed.y)} unités`
                : " " + fmtEUR0.format(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: {
            beginAtZero: true,
            grid: gridStyle,
            border: { display: false },
            ticks: { padding: 10, callback: v => fmtEUR0.format(v) }
          },
          y1: {
            position: "right",
            beginAtZero: true,
            grid: { display: false },
            border: { display: false },
            ticks: { display: false }
          }
        }
      }
    });

    // --- GRAPHIQUE 3 : QUANTITÉS PAR CATÉGORIE (ANNEAU) ---
    const doughnutChart = new Chart(document.getElementById("doughnut-chart").getContext("2d"), {
      type: "doughnut",
      data: {
        labels: CATEGORIES,
        datasets: [{
          data: qteParCategorie(data),
          backgroundColor: PALETTE,
          borderWidth: 4,
          borderColor: "#ffffff",
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, pointStyle: "circle", padding: 18, boxWidth: 8 }
          },
          tooltip: {
            ...tooltipStyle,
            displayColors: true,
            callbacks: { label: ctx => ` ${ctx.label} : ${fmtNumber.format(ctx.parsed)} unités` }
          }
        }
      }
    });

    function mettreAJourGraphiques(donnees) {
      barChart.data.datasets[0].data = caParCategorie(donnees);
      lineChart.data.datasets[0].data = caParMois(donnees);
      lineChart.data.datasets[1].data = qteParMois(donnees);
      doughnutChart.data.datasets[0].data = qteParCategorie(donnees);
      barChart.update();
      lineChart.update();
      doughnutChart.update();
    }

    // --- GESTION DU TABLEAU (avec Empty State) ---
    function formaterDate(dateStr) {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric"
      });
    }

    function afficherTableau(donnees) {
      tableBody.innerHTML = "";
      resultsCount.textContent = donnees.length + (donnees.length > 1 ? " ventes" : " vente");

      if (donnees.length === 0) {
        const row = document.createElement("tr");
        row.className = "empty-row";
        row.innerHTML = `
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-icon">🔍</div>
              <h3 class="empty-title">Aucun produit trouvé</h3>
              <p class="empty-text">Essayez un autre mot-clé ou modifiez vos filtres.</p>
              <button type="button" class="btn-reset" data-action="reset">Réinitialiser les filtres</button>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
        return;
      }

      donnees.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="date">${formaterDate(item.date)}</td>
          <td class="product">${item.product}</td>
          <td><span class="badge">${item.category}</span></td>
          <td class="num">${fmtEUR2.format(item.price)}</td>
          <td class="num">${item.quantity}</td>
        `;
        tableBody.appendChild(row);
      });
    }

    // --- PANNEAU DES DERNIÈRES VENTES (à droite) ---
    function afficherPanneau(donnees) {
      recentCount.textContent = donnees.length + (donnees.length > 1 ? " ventes" : " vente");

      const recentes = [...donnees]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6);

      if (recentes.length === 0) {
        recentList.innerHTML = '<li class="recent-empty">Aucune vente à afficher</li>';
        return;
      }

      recentList.innerHTML = recentes.map(item => {
        const couleur = AVATAR_COLORS[CATEGORIES.indexOf(item.category)];
        return `
          <li class="recent-item">
            <span class="recent-avatar" style="background:${couleur}">${item.category.slice(0, 2).toUpperCase()}</span>
            <div class="recent-info">
              <strong>${item.product}</strong>
              <small>${formaterDate(item.date)} · ${item.quantity} unité(s)</small>
            </div>
            <span class="recent-price">${fmtEUR0.format(item.price * item.quantity)}</span>
          </li>`;
      }).join("");
    }

    // --- FILTRES, TRI ET RÉINITIALISATION ---
    function appliquerFiltresEtTri() {
      const texteRecherche = searchInput.value.trim().toLowerCase();
      const categorieSelectionnee = categoryFilter.value;
      const ordreTri = priceSort.value;

      const ventesFiltrees = data.filter(item => {
        const correspondRecherche = item.product.toLowerCase().includes(texteRecherche);
        const correspondCategorie =
          categorieSelectionnee === "Toutes les catégories" || item.category === categorieSelectionnee;
        return correspondRecherche && correspondCategorie;
      });

      if (ordreTri === "croissant") {
        ventesFiltrees.sort((a, b) => a.price - b.price);
      } else if (ordreTri === "decroissant") {
        ventesFiltrees.sort((a, b) => b.price - a.price);
      } else {
        // Par défaut : ventes les plus récentes en premier
        ventesFiltrees.sort((a, b) => b.date.localeCompare(a.date));
      }

      afficherTableau(ventesFiltrees);
      afficherKPI(ventesFiltrees);
      mettreAJourGraphiques(ventesFiltrees);
      afficherPanneau(ventesFiltrees);
    }

    function reinitialiserFiltres() {
      searchInput.value = "";
      categoryFilter.value = "Toutes les catégories";
      priceSort.value = "defaut";
      appliquerFiltresEtTri();
    }

    searchInput.addEventListener("input", appliquerFiltresEtTri);
    categoryFilter.addEventListener("change", appliquerFiltresEtTri);
    priceSort.addEventListener("change", appliquerFiltresEtTri);
    resetBtn.addEventListener("click", reinitialiserFiltres);

    // Bouton "Réinitialiser" affiché dans l'Empty State
    tableBody.addEventListener("click", event => {
      if (event.target.closest("[data-action='reset']")) reinitialiserFiltres();
    });

    // Affichage initial
    appliquerFiltresEtTri();
  })
  .catch(error => {
    console.error("Erreur lors du chargement des données :", error);
    document.getElementById("table-body").innerHTML = `
      <tr class="empty-row">
        <td colspan="5">
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h3 class="empty-title">Impossible de charger les données</h3>
            <p class="empty-text">Vérifiez que sales.json est présent et lancez le projet avec Live Server.</p>
          </div>
        </td>
      </tr>
    `;
  });