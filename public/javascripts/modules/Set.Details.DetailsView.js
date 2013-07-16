Cards.module('Set.Details', function(Details, App) {
	Details.ItemView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-item",
		className: "item",
		events: {
			"click a": "linkClicked",
			"click div.box": "cardClicked"
		},
		cardClicked: function(ev) {
			ev.preventDefault();

			var front = $(ev.currentTarget).find('div.front');
			var back = $(ev.currentTarget).find('div.back');

			front.toggle();
			back.toggle();
		},
		linkClicked: function(ev) {
			ev.preventDefault();
			console.log("link");
			
			//App.trigger("set:details", this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("id"));
		}
	});	
	Details.DetailsView = Backbone.Marionette.CompositeView.extend({
		itemView: Details.ItemView,
		itemViewContainer: "div.carousel-inner",
		template: "#set-details-collection",
		events: {
			"click a.carousel-control": "cycleCarousel"
		},
		cycleCarousel: function(ev) {
			if($(ev.target).hasClass("left")) {
				this.$el.carousel("prev");
			} else if($(ev.target).hasClass("right")) {
				this.$el.carousel("next");
			}
		},
		onRender: function() {
			this.$el.find("div.item").first().addClass("active");

			var pickerContainer = this.$el.find("ol.carousel-indicators").first();
			for(var i = 0; i < this.collection.length; i++) {
				var indicatorElem = $("<li></li>").attr("data-slide-to", i);
				if(i === 0) indicatorElem.addClass("active");	

				pickerContainer.append(indicatorElem);
			}

			this.$el.carousel({ interval: false });
		}
	});
});