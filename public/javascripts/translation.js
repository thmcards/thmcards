function getLang(){
	language_complete = navigator.language.split("-");
	language = (language_complete[0]);

	moment.lang(language);
}

function i18ninit(){
	i18n.init({ lng: language, fallbackLng: 'en' }, function() {
		$(".intro").i18n();
		$(".carousel-inner").i18n();

		$(".navbar").i18n();
		$("#main").i18n();
		$('#footer').i18n();
	});
}

$(document).ready(function() {
	getLang();
	i18ninit();
});




