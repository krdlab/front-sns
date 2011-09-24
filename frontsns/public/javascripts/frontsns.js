;(function($) {
  $(function() {

    var get_active_service = function() {
      return $('#service_tabs').find('li.active > a').text().toLowerCase();
    };

    $('#user_post').click(function(e) {
      var active_service = get_active_service();  // TODO checkbox で複数選ばせること
      var $user_message = $('#user_message');
      var message = $user_message.val();
      if (message) {
        $.post('/post_message',
               { services: [active_service], user_message: message }, function(data) {
          console.log(data);
          $user_message.val('');
        }, 'json');
      }
      e.preventDefault();
      e.stopPropagation();
    });

    $('#signout').click(function(e) {
      var active_service = get_active_service();
      $.post('/signout', { service: active_service }, function(data) {
        console.log(data);
        var $main_line = $('#main_line');
        $main_line.empty();
        if (active_service === 'twitter') {
          $main_line.append($('<a href="/auth/twitter"><img src="/images/twitter/sign-in-with-twitter-d.png" /></a>'));
        } else {
          $main_line.append('<div>sorry</div>');
        }
      }, 'json');
      e.preventDefault();
      e.stopPropagation();
    });

    // サービス切り替え
    var $tabs = $('#service_tabs > li');
    $tabs.find('> a').click(function(e) {
      $tabs.removeClass('active');
      $(this).parent().addClass('active');
      e.preventDefault();
      e.stopPropagation();
    });

    // 接続開始
    var socket = new io.Socket();
    socket.on('connect', function() {
      socket.on('message', function(data) {
        $('#stream_line').prepend($('<li />').text(data.text));
      });
    });
    //socket.connect();

    // 初期画面表示
    // javascript で操作する HTML はサーバサイドで生成
    var $home = $('#home_timeline');
    if (0 < $home.size()) {
      var active_service = get_active_service();
      $.getJSON('/home_timeline',
                { service: active_service, num: 20 }, function(data, status, xhr) {
        if ($.isArray(data)) {
          $.each(data, function(i, e) {
            $home.append($('<li />').text(e.text));
          });
        } else {
          console.log(data);
        }
      });
    }

  }); // ready
})(jQuery);
