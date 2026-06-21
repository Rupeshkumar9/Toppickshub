export async function GET(context) {
  const posts = Object.values(import.meta.glob('../content/blog/*.md', { eager: true }));
  
  const sortedPosts = posts.sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());
  
  const itemsXml = sortedPosts.map(post => {
    const filename = post.file.split(/[/\\]/).pop() || '';
    const id = filename.replace(/\.md$/, '');
    const url = `${context.site || 'https://toppickshub.com'}/blog/${id}`;
    
    return `
    <item>
      <title><![CDATA[${post.frontmatter.title}]]></title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(post.frontmatter.date).toUTCString()}</pubDate>
      <description><![CDATA[${post.frontmatter.excerpt}]]></description>
    </item>`;
  }).join('');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>TopPicksHub Blog</title>
  <link>${context.site || 'https://toppickshub.com'}</link>
  <description>Honest reviews, expert recommendations, and unbeatable deals on the best gear, gadgets, and everyday essentials.</description>
  <atom:link href="${context.site || 'https://toppickshub.com'}/rss.xml" rel="self" type="application/rss+xml"/>
  ${itemsXml}
</channel>
</rss>`;

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}
