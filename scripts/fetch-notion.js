#!/usr/bin/env node
const fs = require('fs');

const TOKEN = process.env.NOTION_TOKEN;
const DB_ID  = process.env.NOTION_DATABASE_ID;

if (!TOKEN || !DB_ID) {
  console.error('NOTION_TOKEN と NOTION_DATABASE_ID の環境変数が必要です');
  process.exit(1);
}

async function notionFetch(endpoint, body = null) {
  const options = {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`https://api.notion.com/v1/${endpoint}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API [${endpoint}]: ${res.status} ${text}`);
  }
  return res.json();
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function richTextToHtml(rts = []) {
  return rts.map(rt => {
    let t = esc(rt.plain_text);
    if (rt.annotations?.bold)          t = `<strong>${t}</strong>`;
    if (rt.annotations?.italic)        t = `<em>${t}</em>`;
    if (rt.annotations?.code)          t = `<code>${t}</code>`;
    if (rt.annotations?.strikethrough) t = `<s>${t}</s>`;
    if (rt.href)                        t = `<a href="${esc(rt.href)}" target="_blank" rel="noopener">${t}</a>`;
    return t;
  }).join('');
}

function blocksToHtml(blocks) {
  let html = '';
  let inUl = false, inOl = false;

  for (const b of blocks) {
    if (b.type !== 'bulleted_list_item'  && inUl) { html += '</ul>\n'; inUl = false; }
    if (b.type !== 'numbered_list_item' && inOl) { html += '</ol>\n'; inOl = false; }

    switch (b.type) {
      case 'paragraph': {
        const t = richTextToHtml(b.paragraph.rich_text);
        html += t ? `<p>${t}</p>\n` : '<br>\n';
        break;
      }
      case 'heading_1':
        html += `<h2>${richTextToHtml(b.heading_1.rich_text)}</h2>\n`;
        break;
      case 'heading_2':
        html += `<h3>${richTextToHtml(b.heading_2.rich_text)}</h3>\n`;
        break;
      case 'heading_3':
        html += `<h4>${richTextToHtml(b.heading_3.rich_text)}</h4>\n`;
        break;
      case 'bulleted_list_item':
        if (!inUl) { html += '<ul>\n'; inUl = true; }
        html += `  <li>${richTextToHtml(b.bulleted_list_item.rich_text)}</li>\n`;
        break;
      case 'numbered_list_item':
        if (!inOl) { html += '<ol>\n'; inOl = true; }
        html += `  <li>${richTextToHtml(b.numbered_list_item.rich_text)}</li>\n`;
        break;
      case 'quote':
        html += `<blockquote>${richTextToHtml(b.quote.rich_text)}</blockquote>\n`;
        break;
      case 'divider':
        html += '<hr>\n';
        break;
      case 'image': {
        const url = b.image.type === 'external'
          ? b.image.external.url
          : b.image.file.url;
        const cap = richTextToHtml(b.image.caption);
        html += `<figure><img src="${esc(url)}" alt="${esc(cap)}" loading="lazy">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>\n`;
        break;
      }
    }
  }

  if (inUl) html += '</ul>\n';
  if (inOl) html += '</ol>\n';
  return html;
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function getExcerpt(blocks, maxLen = 120) {
  for (const b of blocks) {
    if (b.type === 'paragraph' && b.paragraph.rich_text.length > 0) {
      const text = b.paragraph.rich_text.map(r => r.plain_text).join('');
      return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
    }
  }
  return '';
}

const HEAD = (title) => `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} | 木下大志郎</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="blog.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;600;700&family=Shippori+Mincho:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap" rel="stylesheet" />
</head>
<body>`;

const NAV = `<nav class="nav" id="nav">
  <a class="nav__logo" href="index.html">木下大志郎</a>
  <ul class="nav__links">
    <li><a href="index.html#about">について</a></li>
    <li><a href="index.html#what">哲学カウンセリングとは</a></li>
    <li><a href="index.html#flow">セッションの流れ</a></li>
    <li><a href="blog.html">ブログ</a></li>
    <li><a href="index.html#contact" class="nav__cta">お申し込み</a></li>
  </ul>
  <button class="nav__hamburger" aria-label="メニューを開く">
    <span></span><span></span><span></span>
  </button>
</nav>`;

const FOOTER = `<footer class="footer">
  <div class="footer__geo">
    <svg viewBox="0 0 1200 200" xmlns="http://www.w3.org/2000/svg">
      <polygon points="0,200 600,0 1200,200" fill="none" stroke="rgba(180,150,80,0.10)" stroke-width="1"/>
    </svg>
  </div>
  <div class="container">
    <div class="footer__inner">
      <div class="footer__brand">
        <p class="footer__name">木下大志郎</p>
        <p class="footer__tagline">哲学カウンセリング</p>
      </div>
      <nav class="footer__nav">
        <a href="index.html#about">について</a>
        <a href="index.html#what">哲学カウンセリングとは</a>
        <a href="index.html#flow">セッションの流れ</a>
        <a href="blog.html">ブログ</a>
        <a href="index.html#contact">お申し込み</a>
      </nav>
    </div>
    <div class="footer__bottom">
      <p class="footer__copy">&copy; 2026 木下大志郎. All rights reserved.</p>
    </div>
  </div>
</footer>`;

function generatePostPage({ title, category, date, contentHtml }) {
  return `${HEAD(title)}

${NAV}

<main class="post-page">
  <div class="post-page__header">
    <div class="post-page__header-geo">
      <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
        <polygon points="0,400 400,100 800,400" fill="none" stroke="rgba(180,150,80,0.10)" stroke-width="1"/>
        <polygon points="400,400 800,0 1200,400" fill="none" stroke="rgba(180,150,80,0.08)" stroke-width="1"/>
        <circle cx="950" cy="120" r="100" fill="none" stroke="rgba(180,150,80,0.06)" stroke-width="1"/>
      </svg>
    </div>
    <div class="container container--narrow">
      <a class="post-page__back" href="blog.html">← ブログ一覧へ</a>
      ${category ? `<div><span class="post-page__cat">${esc(category)}</span></div>` : ''}
      <h1 class="post-page__title">${esc(title)}</h1>
      ${date ? `<p class="post-page__date">${formatDate(date)}</p>` : ''}
      <div class="section__rule" style="margin: 0"></div>
    </div>
  </div>
  <div class="container container--narrow">
    <article class="post-content">
      ${contentHtml}
    </article>
    <div class="post-page__footer-nav">
      <a class="btn btn--ghost" href="blog.html">← ブログ一覧へ戻る</a>
    </div>
  </div>
</main>

${FOOTER}
<script src="script.js"></script>
</body>
</html>`;
}

function generateBlogPage(posts) {
  const cardsHtml = posts.length === 0
    ? '<p class="blog-empty">まだ記事がありません。近日公開予定です。</p>'
    : posts.map(p => `    <a class="post-card" href="${p.slug}.html">
      <div class="post-card__meta">
        ${p.category ? `<span class="post-card__cat">${esc(p.category)}</span>` : ''}
        ${p.date ? `<span class="post-card__date">${formatDate(p.date)}</span>` : ''}
      </div>
      <h2 class="post-card__title">${esc(p.title)}</h2>
      ${p.excerpt ? `<p class="post-card__excerpt">${esc(p.excerpt)}</p>` : ''}
      <span class="post-card__read">続きを読む →</span>
    </a>`).join('\n');

  return `${HEAD('ブログ')}

${NAV}

<main>
  <section class="blog-hero">
    <div class="blog-hero__geo">
      <svg viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(180,150,80,0.06)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <polygon points="0,500 500,100 1000,500" fill="none" stroke="rgba(180,150,80,0.10)" stroke-width="1.5"/>
        <polygon points="200,500 700,0 1200,500" fill="none" stroke="rgba(180,150,80,0.07)" stroke-width="1"/>
        <circle cx="1000" cy="150" r="150" fill="none" stroke="rgba(180,150,80,0.06)" stroke-width="1"/>
      </svg>
    </div>
    <div class="container">
      <p class="section__label">Blog</p>
      <h1 class="blog-hero__title">哲学ブログ</h1>
      <div class="section__rule"></div>
      <p class="section__desc">問いを持ち続けることの記録。<br/>哲学的考察とカウンセリングの現場から。</p>
    </div>
  </section>

  <section class="section blog-list">
    <div class="container">
      <div class="blog-grid">
${cardsHtml}
      </div>
    </div>
  </section>
</main>

${FOOTER}
<script src="script.js"></script>
</body>
</html>`;
}

async function main() {
  console.log('Notionからブログ記事を取得中...');

  let allPages = [];
  let cursor;
  do {
    const body = {
      filter: { property: '公開', checkbox: { equals: true } },
    };
    if (cursor) body.start_cursor = cursor;

    const result = await notionFetch(`databases/${DB_ID}/query`, body);
    allPages = allPages.concat(result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);

  allPages.sort((a, b) => {
    const da = a.properties.日付?.date?.start || '';
    const db = b.properties.日付?.date?.start || '';
    return db.localeCompare(da);
  });

  console.log(`${allPages.length}件の公開記事を取得しました`);

  const posts = [];
  const postFiles = new Map();

  for (const page of allPages) {
    const titleProp = Object.values(page.properties).find(p => p.type === 'title');
    const title    = titleProp?.title?.[0]?.plain_text || '無題';
    const category = page.properties.カテゴリ?.select?.name || '';
    const date     = page.properties.日付?.date?.start || '';
    const id       = page.id.replace(/-/g, '');
    const slug     = `blog-${id}`;

    const blocksResult = await notionFetch(`blocks/${page.id}/children`);
    const blocks = blocksResult.results;

    const excerpt     = getExcerpt(blocks);
    const contentHtml = blocksToHtml(blocks);

    posts.push({ title, category, date, slug, excerpt });
    postFiles.set(slug, generatePostPage({ title, category, date, contentHtml }));
    console.log(`  処理済み: ${title}`);
  }

  // 古い記事ファイルを削除
  const oldFiles = fs.readdirSync('.').filter(f => /^blog-[a-f0-9]+\.html$/.test(f));
  oldFiles.forEach(f => { fs.unlinkSync(f); console.log(`  削除: ${f}`); });

  // 新しい記事ファイルを書き出し
  for (const [slug, html] of postFiles) {
    fs.writeFileSync(`${slug}.html`, html, 'utf8');
    console.log(`  生成: ${slug}.html`);
  }

  // ブログ一覧ページを書き出し
  fs.writeFileSync('blog.html', generateBlogPage(posts), 'utf8');
  console.log(`\nblog.html を生成しました（${posts.length}件）`);
}

main().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});
