'use strict';

// Only initialize our code when the document is ready
$(document).ready(() => {
  // Add event handler for clicking on the insert embed media button
  $('#insertEmbedMedia').click(() => {
    $('#embedMediaModal').toggleClass('popup-show');
  });

  // Add event handler for clicking on the cancel button
  $('#cancelEmbedMedia').click(() => {
    $('#embedMediaModal').toggleClass('popup-show');
  });
});
