const Image = require("@11ty/eleventy-img");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = function(eleventyConfig) {
  // Minify CSS during build - output directly to _site to avoid watch loops
  eleventyConfig.on("eleventy.before", () => {
    const cssPath = path.join(__dirname, "css", "styles.css");
    const outputDir = path.join(__dirname, "_site", "css");
    const outputPath = path.join(outputDir, "styles.min.css");
    
    if (fs.existsSync(cssPath)) {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Only minify if source is newer or output doesn't exist
      const shouldMinify = !fs.existsSync(outputPath) || 
        fs.statSync(cssPath).mtime > fs.statSync(outputPath).mtime;
      
      if (shouldMinify) {
        try {
          execSync(`npx cleancss -o "${outputPath}" "${cssPath}"`, { stdio: "pipe" });
          console.log("✓ Minified styles.css");
        } catch (error) {
          console.error("Error minifying CSS:", error);
        }
      }
    }
  });
  // Image optimization filter - use like: {{ '/images/path.jpg' | image }}
  eleventyConfig.addLiquidFilter("image", async function(imagePath) {
    if (!imagePath) return "";
    
    // Remove leading slash
    let cleanPath = imagePath.replace(/^\//, "");
    
    try {
      let stats = await Image(cleanPath, {
        widths: [null], // Single size, maintain original width
        formats: ["webp"],
        outputDir: "_site/img/",
        urlPath: "/img/",
        sharpWebpOptions: {
          quality: 80
        }
      });
      
      // Return the WebP URL
      return stats.webp[0].url;
    } catch (error) {
      console.error(`Error optimizing image ${imagePath}:`, error);
      // Fallback to original path if optimization fails
      return imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    }
  });

  // Image shortcode for generating full <img> tags
  eleventyConfig.addShortcode("image", async function(imagePath, alt = "", className = "") {
    if (!imagePath) return "";
    
    // Remove leading slash
    let cleanPath = imagePath.replace(/^\//, "");
    
    try {
      let stats = await Image(cleanPath, {
        widths: [null], // Single size, maintain original width
        formats: ["webp"],
        outputDir: "_site/img/",
        urlPath: "/img/",
        sharpWebpOptions: {
          quality: 80
        }
      });
      
      let imageAttributes = {
        alt: alt,
        loading: "lazy",
        decoding: "async"
      };
      
      if (className) {
        imageAttributes.class = className;
      }
      
      // Generate the <img> tag
      return Image.generateHTML(stats, imageAttributes);
    } catch (error) {
      console.error(`Error optimizing image ${imagePath}:`, error);
      // Fallback to original path if optimization fails
      const fallbackPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
      const classAttr = className ? ` class="${className}"` : "";
      return `<img src="${fallbackPath}" alt="${alt}"${classAttr}>`;
    }
  });

  // Copy static assets
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("fonts");
  
  // Copy CNAME file if it exists (for custom domain)
  eleventyConfig.addPassthroughCopy("CNAME");

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["html", "md", "liquid", "njk"],
    htmlTemplateEngine: "liquid",
    markdownTemplateEngine: "liquid",
    passthroughFileCopy: true
  };
};

