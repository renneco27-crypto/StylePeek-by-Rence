const technologies = {
  frontend: {
    name: 'Frontend Frameworks & Libraries',
    icon: '⚛️',
    technologies: [
      {
        name: 'React',
        icon: '⚛️',
        patterns: {
          js: ['React', 'ReactDOM'],
          dom: '[data-reactroot], [data-reactid]',
          script: /react(-dom)?\..*\.js/i
        }
      },
      {
        name: 'Vue.js',
        icon: '💚',
        patterns: {
          js: ['Vue'],
          dom: '[data-v-], [v-cloak]',
          script: /vue\..*\.js/i
        }
      },
      {
        name: 'Angular',
        icon: '🅰️',
        patterns: {
          js: ['ng', 'angular'],
          dom: '[ng-app], [ng-controller], [ng-version]',
          script: /angular\..*\.js/i
        }
      },
      {
        name: 'jQuery',
        icon: '💙',
        patterns: {
          js: ['jQuery', '$'],
          script: /jquery(-\d+\.\d+\.\d+)?(\.min)?\.js/i
        }
      },
      {
        name: 'Bootstrap',
        icon: '🅱️',
        patterns: {
          script: /bootstrap\..*\.js/i,
          css: /bootstrap\..*\.css/i,
          dom: '.container, .row, .col-'
        }
      },
      {
        name: 'Tailwind CSS',
        icon: '🎨',
        patterns: {
          css: /tailwind\..*\.css/i,
          dom: '[class*="sm:"], [class*="md:"], [class*="lg:"]'
        }
      },
      {
        name: 'Next.js',
        icon: '▲',
        patterns: {
          js: ['__NEXT_DATA__'],
          meta: { name: 'next-head-count' },
          script: /_next\/static\//i
        }
      },
      {
        name: 'Nuxt.js',
        icon: '💚',
        patterns: {
          js: ['__NUXT__'],
          script: /_nuxt\//i
        }
      },
      {
        name: 'Svelte',
        icon: '🧡',
        patterns: {
          script: /svelte\..*\.js/i,
          dom: '[class*="svelte-"]'
        }
      },
      {
        name: 'Alpine.js',
        icon: '🏔️',
        patterns: {
          js: ['Alpine'],
          dom: '[x-data], [x-show], [x-bind]'
        }
      },
      {
        name: 'Ember.js',
        icon: '🔥',
        patterns: {
          js: ['Ember'],
          script: /ember\..*\.js/i
        }
      },
      {
        name: 'Backbone.js',
        icon: '🦴',
        patterns: {
          js: ['Backbone'],
          script: /backbone\..*\.js/i
        }
      },
      {
        name: 'HTMX',
        icon: '⚡',
        patterns: {
          dom: '[hx-get], [hx-post], [hx-trigger]',
          script: /htmx\..*\.js/i
        }
      },
      {
        name: 'Webpack',
        icon: '📦',
        patterns: {
          script: /webpack\..*\.js/i,
          js: ['webpackJsonp']
        }
      },
      {
        name: 'Vite',
        icon: '⚡',
        patterns: {
          script: /@vite/i
        }
      }
    ]
  },
  
  backend: {
    name: 'Backend & Server Technologies',
    icon: '🖥️',
    technologies: [
      {
        name: 'Node.js',
        icon: '💚',
        patterns: {
          headers: { 'x-powered-by': /Express|Koa|Fastify|Node\.js/i }
        }
      },
      {
        name: 'Express',
        icon: '🚂',
        patterns: {
          headers: { 'x-powered-by': /Express/i }
        }
      },
      {
        name: 'PHP',
        icon: '🐘',
        patterns: {
          headers: { 'x-powered-by': /PHP/i },
          script: /\.php$/i
        }
      },
      {
        name: 'Django',
        icon: '🐍',
        patterns: {
          headers: { 'x-framework': /Django/i },
          cookie: 'csrftoken'
        }
      },
      {
        name: 'Flask',
        icon: '🌶️',
        patterns: {
          cookie: 'session'
        }
      },
      {
        name: 'Ruby on Rails',
        icon: '💎',
        patterns: {
          headers: { 'x-powered-by': /Phusion Passenger/i },
          meta: { name: 'csrf-token' }
        }
      },
      {
        name: 'Laravel',
        icon: '🔴',
        patterns: {
          cookie: 'laravel_session',
          meta: { name: 'csrf-token' }
        }
      },
      {
        name: 'ASP.NET',
        icon: '🔷',
        patterns: {
          headers: { 'x-aspnet-version': /.*/i, 'x-powered-by': /ASP\.NET/i },
          cookie: 'ASP.NET_SessionId'
        }
      },
      {
        name: 'Spring',
        icon: '🍃',
        patterns: {
          cookie: 'JSESSIONID'
        }
      }
    ]
  },
  
  cms: {
    name: 'CMS Platforms',
    icon: '📝',
    technologies: [
      {
        name: 'WordPress',
        icon: '📘',
        patterns: {
          meta: { name: 'generator', content: /WordPress/i },
          script: /wp-content|wp-includes/i,
          dom: 'link[href*="wp-content"]'
        }
      },
      {
        name: 'Drupal',
        icon: '💧',
        patterns: {
          meta: { name: 'generator', content: /Drupal/i },
          script: /drupal\.js/i,
          headers: { 'x-drupal-cache': /.*/i }
        }
      },
      {
        name: 'Joomla',
        icon: '🔶',
        patterns: {
          meta: { name: 'generator', content: /Joomla/i },
          script: /\/media\/jui\//i
        }
      },
      {
        name: 'Shopify',
        icon: '🛍️',
        patterns: {
          script: /cdn\.shopify\.com/i,
          dom: '[data-shopify]'
        }
      },
      {
        name: 'Wix',
        icon: '🎭',
        patterns: {
          script: /static\.wixstatic\.com/i,
          dom: '[data-wix-]'
        }
      },
      {
        name: 'Squarespace',
        icon: '◼️',
        patterns: {
          script: /static\.squarespace\.com/i
        }
      },
      {
        name: 'Webflow',
        icon: '🌊',
        patterns: {
          script: /webflow\.com/i,
          meta: { name: 'generator', content: /Webflow/i }
        }
      },
      {
        name: 'Ghost',
        icon: '👻',
        patterns: {
          meta: { name: 'generator', content: /Ghost/i }
        }
      },
      {
        name: 'Magento',
        icon: '🛒',
        patterns: {
          script: /mage\/|magento/i,
          js: ['Mage']
        }
      }
    ]
  },
  
  analytics: {
    name: 'Analytics & Marketing',
    icon: '📊',
    technologies: [
      {
        name: 'Google Analytics',
        icon: '📈',
        patterns: {
          script: /google-analytics\.com\/analytics\.js|googletagmanager\.com\/gtag\/js/i,
          js: ['ga', 'gtag', '_gaq']
        }
      },
      {
        name: 'Google Tag Manager',
        icon: '🏷️',
        patterns: {
          script: /googletagmanager\.com\/gtm\.js/i,
          js: ['google_tag_manager']
        }
      },
      {
        name: 'Facebook Pixel',
        icon: '👤',
        patterns: {
          script: /connect\.facebook\.net.*\/fbevents\.js/i,
          js: ['fbq']
        }
      },
      {
        name: 'Hotjar',
        icon: '🔥',
        patterns: {
          script: /static\.hotjar\.com/i,
          js: ['hj']
        }
      },
      {
        name: 'Mixpanel',
        icon: '📊',
        patterns: {
          script: /cdn\.mxpnl\.com/i,
          js: ['mixpanel']
        }
      },
      {
        name: 'Segment',
        icon: '🔧',
        patterns: {
          script: /cdn\.segment\.com/i,
          js: ['analytics']
        }
      },
      {
        name: 'Heap Analytics',
        icon: '📚',
        patterns: {
          script: /heapanalytics\.com/i,
          js: ['heap']
        }
      }
    ]
  },
  
  cdn: {
    name: 'CDN & Infrastructure',
    icon: '🌐',
    technologies: [
      {
        name: 'Cloudflare',
        icon: '☁️',
        patterns: {
          headers: { 'server': /cloudflare/i, 'cf-ray': /.*/i }
        }
      },
      {
        name: 'Amazon CloudFront',
        icon: '☁️',
        patterns: {
          headers: { 'x-amz-cf-id': /.*/i, 'via': /CloudFront/i }
        }
      },
      {
        name: 'Fastly',
        icon: '⚡',
        patterns: {
          headers: { 'x-fastly-request-id': /.*/i }
        }
      },
      {
        name: 'Akamai',
        icon: '🌊',
        patterns: {
          headers: { 'x-akamai-': /.*/i }
        }
      },
      {
        name: 'Nginx',
        icon: '🟢',
        patterns: {
          headers: { 'server': /nginx/i }
        }
      },
      {
        name: 'Apache',
        icon: '🪶',
        patterns: {
          headers: { 'server': /Apache/i }
        }
      }
    ]
  },
  
  hosting: {
    name: 'Hosting & Platforms',
    icon: '☁️',
    technologies: [
      {
        name: 'Vercel',
        icon: '▲',
        patterns: {
          headers: { 'x-vercel-id': /.*/i, 'server': /Vercel/i }
        }
      },
      {
        name: 'Netlify',
        icon: '🌐',
        patterns: {
          headers: { 'x-nf-request-id': /.*/i, 'server': /Netlify/i }
        }
      },
      {
        name: 'Heroku',
        icon: '💜',
        patterns: {
          headers: { 'via': /vegur/i }
        }
      },
      {
        name: 'AWS',
        icon: '🟠',
        patterns: {
          headers: { 'x-amz-': /.*/i }
        }
      },
      {
        name: 'Google Cloud',
        icon: '☁️',
        patterns: {
          headers: { 'server': /Google Frontend/i, 'x-goog-': /.*/i }
        }
      },
      {
        name: 'GitHub Pages',
        icon: '📄',
        patterns: {
          headers: { 'server': /GitHub\.com/i }
        }
      }
    ]
  },
  
  other: {
    name: 'Other Tools & Services',
    icon: '🔧',
    technologies: [
      {
        name: 'Stripe',
        icon: '💳',
        patterns: {
          script: /js\.stripe\.com/i,
          js: ['Stripe']
        }
      },
      {
        name: 'PayPal',
        icon: '💰',
        patterns: {
          script: /paypal\.com.*\/sdk\/js/i,
          js: ['paypal']
        }
      },
      {
        name: 'Disqus',
        icon: '💬',
        patterns: {
          script: /disqus\.com/i,
          dom: '#disqus_thread'
        }
      },
      {
        name: 'Font Awesome',
        icon: '🎨',
        patterns: {
          css: /font-awesome/i,
          dom: '[class*="fa-"]'
        }
      },
      {
        name: 'Recaptcha',
        icon: '🔒',
        patterns: {
          script: /recaptcha/i,
          dom: '.g-recaptcha'
        }
      },
      {
        name: 'Cloudflare Turnstile',
        icon: '🔐',
        patterns: {
          script: /challenges\.cloudflare\.com/i
        }
      },
      {
        name: 'Intercom',
        icon: '💬',
        patterns: {
          script: /widget\.intercom\.io/i,
          js: ['Intercom']
        }
      },
      {
        name: 'Zendesk',
        icon: '🎫',
        patterns: {
          script: /zendesk\.com/i,
          js: ['zE']
        }
      }
    ]
  }
};

if (typeof window !== 'undefined') {
  window.technologies = technologies;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = technologies;
}
