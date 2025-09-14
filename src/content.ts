// Type definitions (assuming these are defined elsewhere)

function extractStoryStats(): StoryStats | null {
  try {
    console.log("[WriterAnalytics][content] Starting data extraction...");

    // Multiple selectors to try for title
    const titleSelectors = [
      'h1[data-testid="story-title"]',
      'h1.story-title',
      'h1.h2',
      '.story-header h1',
      '.part-title h1',
      'h1:first-of-type'
    ];
    
    let title: string | null = null;
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        title = el.textContent.trim();
        console.log(`[WriterAnalytics][content] Found title using selector: ${selector}`);
        break;
      }
    }

    // Multiple selectors for author
    const authorSelectors = [
      '[data-testid="story-author"] a',
      '.author-name a',
      '.story-author a',
      '.username a',
      '.author a'
    ];
    
    let author: string | null = null;
    for (const selector of authorSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        author = el.textContent.trim();
        console.log(`[WriterAnalytics][content] Found author using selector: ${selector}`);
        break;
      }
    }

    // Multiple selectors for reads
    const readsSelectors = [
      '[data-testid="story-stats"] span:first-child',
      '.reads-count',
      '.story-stats .reads',
      '.stats .reads'
    ];
    
    let reads: number | null = null;
    for (const selector of readsSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        reads = parseNumber(el.textContent.trim());
        console.log(`[WriterAnalytics][content] Found reads using selector: ${selector}, value: ${reads}`);
        break;
      }
    }

    // Multiple selectors for votes
    const votesSelectors = [
      '[data-testid="story-votes"] span',
      '.votes-count',
      '.story-stats .votes',
      '.stats .votes'
    ];
    
    let votes: number | null = null;
    for (const selector of votesSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        votes = parseNumber(el.textContent.trim());
        console.log(`[WriterAnalytics][content] Found votes using selector: ${selector}, value: ${votes}`);
        break;
      }
    }

    // Multiple selectors for comments
    const commentsSelectors = [
      '[data-testid="story-comments"] span',
      '.comments-count',
      '.story-stats .comments',
      '.stats .comments'
    ];
    
    let headerComments: number | null = null;
    for (const selector of commentsSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        headerComments = parseNumber(el.textContent.trim());
        console.log(`[WriterAnalytics][content] Found comments using selector: ${selector}, value: ${headerComments}`);
        break;
      }
    }

    // Extract paragraph comments
    const paragraphComments = extractParagraphComments();

    // Create stats object
    const stats: StoryStats = {
      title,
      author,
      reads,
      votes,
      headerComments,
      commentItemsCount: paragraphComments.length,
      paragraphComments,
      capturedAt: new Date().toISOString(),
    };

    console.log("[WriterAnalytics][content] Extracted stats:", stats);

    // Validate that we got at least some data
    if (!title && !author && !reads && !votes && !headerComments && paragraphComments.length === 0) {
      console.warn("[WriterAnalytics][content] No data extracted, returning null");
      return null;
    }

    return stats;
  } catch (err) {
    console.error("[WriterAnalytics][content] Error extracting stats:", err);
    return null;
  }
}

function parseNumber(text: string): number | null {
  if (!text) return null;
  
  // Remove all non-digit, non-decimal, non-K/M/B characters
  const cleanText = text.replace(/[^\d.KMB]/gi, "");
  const num = parseFloat(cleanText);
  
  if (isNaN(num)) return null;
  
  if (text.toUpperCase().includes("K")) return Math.round(num * 1000);
  if (text.toUpperCase().includes("M")) return Math.round(num * 1000000);
  if (text.toUpperCase().includes("B")) return Math.round(num * 1000000000);
  
  return Math.round(num);
}

function extractParagraphComments(): ParagraphComment[] {
  const paragraphs: ParagraphComment[] = [];
  
  try {
    console.log("[WriterAnalytics][content] Extracting paragraph comments...");
    
    // Target all pages and their paragraphs
    const pages = document.querySelectorAll('.page.highlighter');
    console.log("[WriterAnalytics][content] Found pages:", pages.length);

    pages.forEach((page) => {
      const paragraphElements = page.querySelectorAll('p[data-p-id]');
      console.log(`[WriterAnalytics][content] Found ${paragraphElements.length} paragraphs in page`);

      paragraphElements.forEach((p) => {
        const pId = p.getAttribute('data-p-id') || `p-${paragraphs.length}`;
        const text = p.textContent?.trim() || "";
        
        // Skip very short paragraphs (likely not actual content)
        if (text.length < 10) return;

        // Extract comment count from <span class="num-comment">
        const commentElement = p.querySelector('.num-comment');
        let count = 0;
        if (commentElement) {
          const countText = commentElement.textContent?.trim() || "0";
          count = parseNumber(countText) || 0;
          console.log(`[WriterAnalytics][content] Found comment count ${count} for pId ${pId}`);
        } else {
          console.warn(`[WriterAnalytics][content] No comment count found for pId ${pId}, setting to 0`);
        }

        paragraphs.push({
          pId,
          count,
          raw: text,
          snippet: text.slice(0, 150) + (text.length > 150 ? "..." : "")
        });
      });
    });

    console.log(`[WriterAnalytics][content] Extracted ${paragraphs.length} paragraphs with comments`);
    
  } catch (err) {
    console.error("[WriterAnalytics][content] Error extracting paragraph comments:", err);
  }
  
  return paragraphs;
}

function sendStatsToBackground(stats: StoryStats) {
  try {
    console.log("[WriterAnalytics][content] Sending stats to background:", stats);
    chrome.runtime.sendMessage({
      type: "WA_STATS",
      payload: stats
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("[WriterAnalytics][content] Error sending stats:", chrome.runtime.lastError);
      } else {
        console.log("[WriterAnalytics][content] Stats sent successfully:", response);
      }
    });
  } catch (err) {
    console.error("[WriterAnalytics][content] Error in sendStatsToBackground:", err);
  }
}

function waitForPageContent(): Promise<void> {
  return new Promise((resolve) => {
    // Wait for content to load
    const checkContent = () => {
      const hasContent = document.querySelector('h1') || document.querySelector('.story-title') || document.querySelector('p');
      if (hasContent) {
        console.log("[WriterAnalytics][content] Page content detected");
        resolve();
      } else {
        console.log("[WriterAnalytics][content] Waiting for page content...");
        setTimeout(checkContent, 500);
      }
    };
    
    checkContent();
  });
}

// Main execution
async function init() {
  console.log("[WriterAnalytics][content] Content script loaded on:", window.location.href);
  
  // Check if this is a Wattpad story page
  if (!window.location.href.includes('wattpad.com') || !window.location.pathname.includes('/')) {
    console.log("[WriterAnalytics][content] Not a Wattpad story page, skipping");
    return;
  }
  
  try {
    // Wait for page content to load
    await waitForPageContent();
    
    // Wait a bit more for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract and send stats
    const stats = extractStoryStats();
    if (stats) {
      sendStatsToBackground(stats);
    } else {
      console.log("[WriterAnalytics][content] No stats extracted from this page");
      
      // Send sample data for testing if no real data found
      const sampleStats: StoryStats = {
        title: "Sample Story Title (No Real Data Found)",
        author: "Sample Author",
        reads: 1234,
        votes: 56,
        headerComments: 12,
        commentItemsCount: 5,
        paragraphComments: [
          { pId: "p1", count: 5, snippet: "This is a sample paragraph for testing..." },
          { pId: "p2", count: 3, snippet: "Another sample paragraph..." },
          { pId: "p3", count: 8, snippet: "Third sample paragraph with more engagement..." }
        ],
        capturedAt: new Date().toISOString()
      };
      
      console.log("[WriterAnalytics][content] Sending sample data for testing");
      sendStatsToBackground(sampleStats);
    }
  } catch (err) {
    console.error("[WriterAnalytics][content] Error in init:", err);
  }
}

// Run initialization based on page state
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  // Page already loaded
  setTimeout(init, 1000);
}