(function($) {
    $.fn.atmosBrowser = function(options) {
        var settings = {
            'foo' : 'bar'
        };

        return this.each(function() {
            if (options) {
                $.extend(settings, options);
            }
        });
    };
})(jQuery);