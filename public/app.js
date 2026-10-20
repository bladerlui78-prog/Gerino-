const form = document.querySelector('#shorten-form');
const input = document.querySelector('#url-input');
const result = document.querySelector('#result');
const error = document.querySelector('#error');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.textContent = '';
  result.hidden = true;
  const button = form.querySelector('button');
  button.disabled = true;
  button.textContent = 'Criando...';
  try {
    const response = await fetch('/api/links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input.value.trim() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível criar o link.');
    result.innerHTML = `<strong>Seu link Gerino está pronto:</strong><br><a href="${data.shortUrl}" target="_blank" rel="noopener">${data.shortUrl}</a> <button type="button" id="copy-link">Copiar link</button>`;
    result.hidden = false;
    document.querySelector('#copy-link').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(data.shortUrl); document.querySelector('#copy-link').textContent = 'Copiado!'; }
      catch { document.querySelector('#copy-link').textContent = 'Copie o link acima'; }
    });
  } catch (err) { error.textContent = err.message || 'Falha de conexão. Tente novamente.'; }
  finally { button.disabled = false; button.innerHTML = 'Encurtar <span>→</span>'; }
});