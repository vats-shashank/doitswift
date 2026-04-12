/**
 * Compact results list: per-row Preview, optional gallery thumbnails,
 * batches > 10: extra rows collapsed + gallery disabled.
 */
(function (w) {
  var MAX_MAIN = 10;

  w.DoItSwiftFileResults = {
    MAX_MAIN: MAX_MAIN,

    initCompletedRow: function (item, previewUrl, options) {
      options = options || {};
      item.dataset.previewUrl = previewUrl;
      var panel = item.querySelector('.file-preview-panel');
      var img = panel && panel.querySelector('img');
      var btn = item.querySelector('.btn-preview');
      if (img) {
        img.src = previewUrl;
        img.alt = options.alt || 'Preview';
      }
      if (btn) {
        btn.disabled = false;
        btn.style.visibility = 'visible';
        if (item.dataset.previewWired) return;
        item.dataset.previewWired = '1';
        btn.addEventListener('click', function () {
          if (!panel) return;
          var open = panel.hidden;
          panel.hidden = !open;
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
          btn.textContent = open ? 'Hide' : 'Preview';
        });
      }
      var thumb = item.querySelector('.file-thumb');
      if (thumb && !item.dataset.galleryOn) {
        thumb.innerHTML = '🖼️';
        thumb.classList.remove('file-thumb--gallery');
      }
    },

    applyGallery: function (root, enabled) {
      if (!root) return;
      root.querySelectorAll('.file-item[data-preview-url]').forEach(function (item) {
        var thumb = item.querySelector('.file-thumb');
        var url = item.dataset.previewUrl;
        if (!thumb || !url) return;
        item.dataset.galleryOn = enabled ? '1' : '';
        if (enabled) {
          thumb.innerHTML = '<img src="' + url + '" alt="">';
          thumb.classList.add('file-thumb--gallery');
        } else {
          thumb.classList.remove('file-thumb--gallery');
          thumb.innerHTML = '🖼️';
        }
      });
    },

    setupToolbar: function (opts) {
      var toolbar = opts.toolbar;
      var toggle = opts.galleryToggle;
      var note = opts.note;
      var batchOver10 = opts.batchOver10;
      var galleryRoot = opts.galleryRoot;
      if (!toolbar) return;
      toolbar.style.display = 'flex';
      if (toggle) {
        toggle.disabled = !!batchOver10;
        toggle.checked = false;
        if (batchOver10 && galleryRoot) {
          w.DoItSwiftFileResults.applyGallery(galleryRoot, false);
        }
      }
      if (note) {
        if (batchOver10) {
          note.hidden = false;
          note.textContent =
            'Large batch: thumbnails in the list are off. Use Preview per row, or expand “more files” below. Gallery view works for up to 10 files.';
        } else {
          note.hidden = true;
          note.textContent = '';
        }
      }
    },

    setupMoreFilesSection: function (opts) {
      var block = opts.moreBlock;
      var inner = opts.moreInner;
      var btn = opts.moreBtn;
      var label = opts.moreLabel;
      var extraCount = opts.extraCount;
      if (!block || !inner || !btn || !label || extraCount <= 0) {
        if (block) block.style.display = 'none';
        return;
      }
      block.style.display = 'block';
      inner.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      var moreLabel = function () {
        return extraCount + ' more file' + (extraCount === 1 ? '' : 's') + ' — click to show';
      };
      label.textContent = moreLabel();
      var open = false;
      btn.onclick = function () {
        open = !open;
        inner.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        label.textContent = open ? 'Hide extra files' : moreLabel();
      };
    },

    getAppendParent: function (resultsEl, moreInnerEl, index) {
      if (index < MAX_MAIN) return resultsEl;
      return moreInnerEl || resultsEl;
    },
  };

  document.addEventListener('DOMContentLoaded', function () {
    var t = document.getElementById('galleryViewToggle');
    if (t && !t._doItSwiftGalleryBound) {
      t._doItSwiftGalleryBound = true;
      t.addEventListener('change', function () {
        if (t.disabled) return;
        var root = document.getElementById('fileResultsRoot');
        if (w.DoItSwiftFileResults && root) {
          w.DoItSwiftFileResults.applyGallery(root, t.checked);
        }
      });
    }
  });
})(window);
