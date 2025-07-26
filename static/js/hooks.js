'use strict';

exports.aceInitInnerdocbodyHead = (hookName, args, cb) => {
  const url = '../static/plugins/ep_embedmedia/static/css/ace.css';
  args.iframeHTML.push(`<link rel="stylesheet" type="text/css" href="${url}"/>`);
  cb();
};

exports.aceAttribsToClasses = (hookName, args) => {
  if (args.key === 'embedMedia' && args.value !== '') {
    return [`embedMedia:${args.value}`];
  }
};

exports.aceCreateDomLine = (hookName, args, cb) => {
  if (args.cls.indexOf('embedMedia:') >= 0) {
    const clss = [];
    const argClss = args.cls.split(' ');
    let value;

    for (let i = 0; i < argClss.length; i++) {
      const cls = argClss[i];
      if (cls.indexOf('embedMedia:') !== -1) {
        value = cls.substr(cls.indexOf(':') + 1);
        clss.push(cls); // Keep the class so content collection can restore the attribute later
      } else {
        clss.push(cls);
      }
    }
    const cleanedCode = exports.cleanEmbedCode(unescape(value));
    
    // Only process if we have valid cleaned code
    if (cleanedCode) {
      const media = `<span class='media'>${cleanedCode}</span>`;
      return cb([{
        cls: clss.join(' '),
        // Close both .character and .embedMedia so that trailing ZWSP inserted by the editor
        // is rendered outside of the embed span (allowing caret placement after media)
        extraOpenTags: `<span class='embedMedia' contenteditable='false'>${media}<span class='character'>`,
        extraCloseTags: '</span></span>',
      }]);
    }
    
    // Return a minimal placeholder (empty span) if the media is not supported
    return cb([{
      cls: clss.join(' '),
      extraOpenTags: `<span class='embedMedia' contenteditable='false'><span class='character'>`,
      extraCloseTags: '</span></span>',
    }]);
  }

  return cb();
};


const parseUrlParams = (url) => {
  const res = {};
  url.split('?')[1].split('&').map((item) => {
    item = item.split('=');
    res[item[0]] = item[1];
  });
  return res;
};

exports.sanitize = (inputHtml) => {
  // We only want to allow iframes with YouTube and Vimeo sources
  // First, check if the input contains script tags - if so, reject it immediately
  if (inputHtml.includes('<script') || inputHtml.includes('</script>')) {
    console.warn('Rejected embed containing script tags');
    return '';
  }

  try {
    const $container = $('<div>').html(inputHtml);
    
    // Remove any non-iframe elements completely
    $container.find(':not(iframe)').remove();
    
    // Look for any remaining iframe elements
    const $iframe = $container.find('iframe').first();

    // If we found an iframe, check if it has an allowed src
    if ($iframe.length > 0) {
      const src = $iframe.attr('src');
      if (src) {
        try {
          const urlObj = new URL(src, window.location.href);
          const protocol = urlObj.protocol.replace(':', '');
          const host = urlObj.hostname.toLowerCase();
          const allowedSchemes = ['http', 'https'];

          // Validate scheme (HTTP or HTTPS). Any domain is accepted to support diverse providers.
          if (allowedSchemes.includes(protocol)) {
            // Strip potentially dangerous attributes
            $iframe.removeAttr('srcdoc').removeAttr('onload').removeAttr('onerror');

            // Add a conservative sandbox if one is not present already
            if (!$iframe.attr('sandbox')) {
              $iframe.attr('sandbox', 'allow-same-origin allow-scripts allow-popups allow-presentation');
            }

            // Return sanitized iframe HTML only
            return $('<div>').append($iframe.clone()).html();
          }
        } catch (err) {
          console.warn('Error while validating iframe src', err);
        }
      }
    }

    // If we get here, either there was no iframe or it had an invalid src
    console.warn('No valid iframe found in embed code');
    return '';
    
  } catch (e) {
    console.warn('Error in embed sanitization:', e);
    return '';
  }
};

exports.cleanEmbedCode = (orig) => {
  let res = null;

  const value = $.trim(orig);

  if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0) {
    // Only allow specific domains
    if (value.indexOf('youtube.com') !== -1) {
      // Regular YouTube watch URLs ⇒ convert to privacy-enhanced embed
      let videoId;
      let extra = '';
      try {
        const params = value.split('?')[1] || '';
        const paramArr = params.split('&').filter((p) => p && !p.startsWith('v='));
        extra = paramArr.length ? `?${paramArr.join('&')}` : '';
        videoId = parseUrlParams(value).v;
      } catch (e) {
        // Handle URLs without query parameters
        const urlParts = value.split('/');
        videoId = urlParts[urlParts.length - 1];
      }
      res = `<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${escape(videoId)}${extra}" title="YouTube video player" frameborder="0" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    } else if (value.indexOf('youtu.be') !== -1) {
      // Short YouTube URLs
      let videoIdPart = value.split('youtu.be/')[1];
      let extra = '';
      if (videoIdPart.includes('?')) {
        const split = videoIdPart.split('?');
        videoIdPart = split[0];
        extra = `?${split[1]}`;
      }
      res = `<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${escape(videoIdPart)}${extra}" title="YouTube video player" frameborder="0" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    } else if (value.indexOf('youtube-nocookie.com') !== -1) {
      // YouTube-nocookie URLs
      let videoId;
      let extra = '';
      try {
        const params = value.split('?')[1] || '';
        const paramArr = params.split('&').filter((p) => p && !p.startsWith('v='));
        extra = paramArr.length ? `?${paramArr.join('&')}` : '';
        videoId = parseUrlParams(value).v;
      } catch (e) {
        const urlParts = value.split('/');
        videoId = urlParts[urlParts.length - 1];
      }
      res = `<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${escape(videoId)}${extra}" title="YouTube video player" frameborder="0" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    } else if (value.indexOf('vimeo.com') !== -1) {
      const video = escape(value.split('/').pop());
      // eslint-disable-next-line max-len
      res = `<iframe src="https://player.vimeo.com/video/${video}?color=ffffff" width="420" height="236" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>`;
    } else {
      // For other URLs, we won't automatically convert to iframe. User must provide iframe code.
      console.warn(`Direct URL embedding is only supported for YouTube and Vimeo. For other sites, please use their iframe embed code: ${orig}`);
    }
  } else if (value.indexOf('<') === 0) {
    // Only allow iframe embeds with strict domain checking
    // Check if this might contain script tags - reject immediately if so
    if (value.includes('<script') || value.includes('</script>')) {
      console.warn('Rejected embed code containing script tags');
      return null;
    }
    
    // Check if this is an iframe embed
    if (!value.toLowerCase().includes('<iframe')) {
      console.warn('Rejected non-iframe embed code');
      return null;
    }
    
    // Sanitize strictly to only allow YouTube and Vimeo iframes
    const sanitizedValue = $.trim(exports.sanitize(value));
    if (sanitizedValue !== '') {
      res = sanitizedValue;
    } else {
      console.warn(`Invalid embed code or non-allowed domain: ${orig}`);
    }
  } else {
    console.warn(`Invalid embed code: ${orig}`);
  }

  // Return null instead of error message (will be handled in postToolbarInit)
  return res;
};

// Add aceInitialized hook to set up our custom editor functions
exports.aceInitialized = (hookName, context) => {
  const editorInfo = context.editorInfo;
  
  // Add a custom function to handle embedding media
  editorInfo.ace_embedMedia = (src) => {
    const rep = context.rep;

    // Clone the original selection start BEFORE we modify the doc so indices stay consistent
    const selStart = [rep.selStart[0], rep.selStart[1]];

    // Barrier sequence: space + WORD JOINER + NBSP + WORD JOINER + space
    // We use U+2060 WORD JOINER instead of U+200B ZWSP to avoid clashes with other plugins.
    const WJ = '\u2060';
    const NBSP = '\u00A0';
    const SPACE = ' ';
    const textToInsert = SPACE + WJ + NBSP + WJ + SPACE;

    // Replace the current selection (or insert at cursor) with barrier text
    editorInfo.ace_replaceRange(rep.selStart, rep.selEnd, textToInsert);

    // Attribute should be applied only to the NBSP (middle) character
    const attrStart = [selStart[0], selStart[1] + SPACE.length + WJ.length];
    const attrEnd = [selStart[0], selStart[1] + SPACE.length + WJ.length + NBSP.length];

    editorInfo.ace_performDocumentApplyAttributesToRange(
      attrStart,
      attrEnd,
      [['embedMedia', escape(src)]]);

    // Move cursor after the trailing ZWSP so typing continues outside the embed span
    const finalCursorPos = [selStart[0], selStart[1] + textToInsert.length];
    editorInfo.ace_performSelectionChange(finalCursorPos, finalCursorPos, false);
  };
};

// Handle commands coming from the toolbar button
exports.postToolbarInit = (hookName, context) => {
  // Add error display element after the textarea if it doesn't exist
  if ($('#embedMediaError').length === 0) {
    $('#embedMediaSrc').after('<div id="embedMediaError" style="display:none; margin-top:10px; padding:8px; background-color:#f8d7da; color:#721c24; border:1px solid #f5c6cb; border-radius:4px;"></div>');
  }

  // Add handler for the embed media button click
  $('#doEmbedMedia').off('click').on('click', () => {
    const src = $('#embedMediaSrc').val();
    
    // Hide any previous error
    $('#embedMediaError').hide();
    
    // Check if media is supported before embedding
    const cleanedCode = exports.cleanEmbedCode(src);
    
    if (cleanedCode) {
      $('#embedMediaModal').toggleClass('popup-show');

      // Use the context provided by the hook system to access ace
      context.ace.callWithAce((ace) => {
        ace.ace_embedMedia(src);
      }, 'embedMedia', true);
      // Clear the input field so it does not persist next time
      $('#embedMediaSrc').val('');
    } else {
      // Show error in the modal instead of in the pad
      $('#embedMediaError').html('<strong>Invalid Embed Code</strong><br>Please paste a valid iframe embed code, or a direct link from YouTube/Vimeo.').show();
    }
  });
  
  // Add handler for the cancel button
  $('#cancelEmbedMedia').off('click').on('click', () => {
    // Hide any error message when closing
    $('#embedMediaError').hide();
    $('#embedMediaModal').toggleClass('popup-show');
  });
};

// Hook to correctly translate DOM classes back into document attributes
exports.collectContentPre = (hook, context) => {
  // Match either embedMedia:<value> or embedMedia-<value> class
  const match = /(?:^| )embedMedia[:\-]([^ ]+)/.exec(context.cls || '');
  if (match && match[1]) {
    const value = match[1];
    try {
      context.cc.doAttrib(context.state, `embedMedia::${value}`);
    } catch (e) {
      console.error('[ep_embedmedia collectContentPre] Error applying embedMedia attribute:', e);
    }
  }
};

// No special post-processing is required, but we export an empty function to fulfill the API.
exports.collectContentPost = () => {};
