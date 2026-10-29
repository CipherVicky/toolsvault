// ============ USER FAVORITES ============
// Depends on: helpers.js (api, toast, currentUser)
// Depends on: auth.js (openAuthModal)
// Depends on: tools.js (allTools, renderTools)

let userFavorites = new Set();
let showFavoritesOnly = false;

async function loadFavorites() {
  if (!currentUser) return;
  try {
    const ids = await api('/api/favorites');
    userFavorites = new Set(ids);
    if (allTools.length > 0) renderTools(allTools);
  } catch (err) {
    console.error('Favorites load error:', err);
  }
}

async function toggleFavorite(toolId) {
  if (!currentUser) {
    openAuthModal();
    toast('Please sign in to use favorites', 'error');
    return;
  }

  const isFav = userFavorites.has(toolId);
  try {
    if (isFav) {
      await api(`/api/favorites/${toolId}`, 'DELETE');
      userFavorites.delete(toolId);
      toast('Removed from favorites', 'success');
    } else {
      await api(`/api/favorites/${toolId}`, 'POST');
      userFavorites.add(toolId);
      toast('Added to favorites', 'success');
    }
    renderTools(allTools);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function toggleFavoritesFilter() {
  showFavoritesOnly = !showFavoritesOnly;
  const btn = document.getElementById('favFilterBtn');
  if (btn) btn.classList.toggle('active', showFavoritesOnly);
  renderTools(allTools);
}
