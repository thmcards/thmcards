Cards.module('Set.Rating', function(Rating, App) {
	Rating.ItemView = Backbone.Marionette.ItemView.extend({
		template: "#set-rating-item",
		tagName: "tr",
		events: {
			"click a": "linkClicked",
			"click div.box": "cardClicked"
		},
		linkClicked: function(ev) {
			ev.preventDefault();
			console.log("link");
		},
		onRender: function() {
			this.$("div.rating").raty({ 
				score: function() {
			      return $(this).attr('data-score');
			    },
			    readOnly: true,
				starOff: '/img/star-off.png',
				starOn : '/img/star-on.png',
				starHalf: '/img/star-half.png'
			});
		}
	});	

	Rating.EmptyView = Backbone.Marionette.ItemView.extend({
		template: "#set-rating-item-empty",
		tagName: "tr"
	});	

	Rating.RatingView = Backbone.Marionette.CompositeView.extend({
		emptyView: Rating.EmptyView,
		itemView: Rating.ItemView,
		tagName: "table",
		className: "table table-bordered table-striped table-hover",
		itemViewContainer: "tbody",
		template: "#set-rating-list",
		events: {
			"click .profile-link": "profileLink"
		},
		profileLink: function(ev) {
			ev.preventDefault();
			App.trigger("profile", $(ev.currentTarget).text());
		}
	});

	Rating.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-rating-sideBar",
		className: "well well-sm sidebar-nav",
		events: {
			"click a.back-to-set": "backToSet",
		},
		backToSet: function(ev) {
			ev.preventDefault();
			history.back();
		}
	})
});