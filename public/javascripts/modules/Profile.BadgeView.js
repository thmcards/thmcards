Cards.module('Profile', function(Profile, App) {
	Profile.BadgeItemView = Backbone.Marionette.ItemView.extend({
		template: "#profile-badge-item",
		tagName: "tr",
		events: {
			"click a": "linkClicked"
		},
		linkClicked: function(ev){
			ev.preventDefault();

		},
		onRender: function(){
			i18ninit();
		}
	});

	Profile.BadgeView = Backbone.Marionette.CompositeView.extend({
		tagName: "div",
		className: "panel panel-default",
		template: "#profile-badge-list",
		itemView: Profile.BadgeItemView,
		itemViewContainer: "tbody",
		events: {
			"click a.issueBadge": "issueBadge"
		},
		initialize: function() {
			this.collection.fetch();
		},
		issueBadge: function(ev){
			ev.preventDefault();

			if($("#inputEmail3").val() !== '') {
				$.get("/syncbadges", function(assertions){
				OpenBadges.issue(assertions, function(errors, successes){
					console.log("badge errors", errors);
					console.log("badge successes", successes);
					});
				})
				.fail(function() {
				    alert( "Fehler bei der Synchronisation mit OpenBadges. Bitte später erneut versuchen." );
				})
			} else {
				alert("Bitte trage eine Emailadresse ein");
				$(window).scrollTop(0);
				$("#inputEmail3").focus();
			}

		},
		onRender: function(){
			i18ninit();
		}
	});
});
