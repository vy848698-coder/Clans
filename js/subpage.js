/*
 * ClansMachina — blog/subpage script (search + category filtering).
 *
 * NOTE: This commit (fb91680) only MODIFIED the card-indexing and filter logic
 * inside an already-existing subpage.js (the file had ~430 lines before this
 * commit). Only the logic introduced/changed by the commit is reproduced here.
 * Drop your existing subpage.js in place to restore the full behaviour.
 */

(function () {
  const cards = Array.from(document.querySelectorAll('.blog-page-card'));
  const searchInput = document.getElementById('blogSearch');
  let query = '';
  let activeFilter = 'all';

  cards.forEach(card => {
    const title = card.querySelector('.bp-title-link, .bp-title');
    const chip = card.querySelector('.bp-chip');
    const titleText = title ? title.textContent.toLowerCase() : '';
    const chipText = chip ? chip.textContent.toLowerCase() : '';
    const catText = (card.dataset.category || '').toLowerCase();
    // Free-text search looks across title + chip + category.
    card.dataset.search = (titleText + ' ' + chipText + ' ' + catText).trim();
    // Category filter matches whole slugs only (space-separated), so "solar"
    // never accidentally matches "solar-basics".
    card.dataset.cats = ' ' + catText.split(/\s+/).filter(Boolean).join(' ') + ' ';
  });

  function cardMatches(card) {
    const haystack = card.dataset.search || '';
    const matchesQuery = !query || haystack.includes(query);
    const matchesFilter = activeFilter === 'all' ||
      (card.dataset.cats || '').includes(' ' + activeFilter + ' ');
    return matchesQuery && matchesFilter;
  }

  function applyFilters() {
    cards.forEach(card => {
      card.style.display = cardMatches(card) ? '' : 'none';
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      query = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
  }

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter || 'all';
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });

  applyFilters();
})();
