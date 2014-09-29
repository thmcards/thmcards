Cards.module('Profile', function(Profile, App) {
	Profile.InfoItemView = Backbone.Marionette.ItemView.extend({
		template: "#profile-info-item",
		className: "panel panel-default",
		events: {
			"click a": "linkClicked",
			"keyup #inputEmail3": "checkMail",
			"blur #inputEmail3": "updateMail",
			"click label": "changeProfileVisib"
		},
		checkMail: function(ev) {
			var email = $(ev.currentTarget).val();

			var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
    		if(!pattern.test(email)) {
    			$(ev.currentTarget).closest(".form-group").addClass("has-warning");
    			$(ev.currentTarget).closest(".form-group").removeClass("has-success");
    		} else {
    			$(ev.currentTarget).closest(".form-group").addClass("has-success");
    			$(ev.currentTarget).closest(".form-group").removeClass("has-warning");
    		}
		},
		updateMail: function(ev) {
			var email = $("#inputEmail3").val();

			var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
			if(pattern.test(email)) {
				if(email !== '') {
					var model = this.model.save({
						email: email
					}, {
						success: function(){
							$("#inputEmail3").parent().parent().addClass("has-success");
							setTimeout(function(){
								$("#inputEmail3").parent().parent().removeClass("has-success");
							}, 2000)
						},
						error: function(){
							$("#inputEmail3").parent().parent().addClass("has-error");
						}
					});
				}
			}
		},
		changeProfileVisib: function(ev) {
			if($(ev.currentTarget).hasClass('active')) return;

			var visibility = 'private';
			if($(ev.currentTarget).hasClass('profile-public')) {
				visibility = 'public';
			}

			if(visibility === "public" || visibility === "private") {
				var model = this.model.save({
							profile: visibility
						}, {
							success: function(){

							},
							error: function(){
								alert("Fehler beim Speichern");
							}
						});
			}
		},
		linkClicked: function(ev){
			ev.preventDefault();
			ev.stopPropagation();
			$.get('/badge', function(data) {
				OpenBadges.issue(data, function(errors, successes) {
					console.log(errors, successes);
			 	});
			});
		},
		onRender: function(){
			i18ninit();
			$("#profileName").text(this.model.escape("username"));
		}
	});
});
