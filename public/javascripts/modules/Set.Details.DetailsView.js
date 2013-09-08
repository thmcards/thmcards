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

	Details.EmptyView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-item-empty",
		className: "empty-item"
	});	

	Details.DetailsView = Backbone.Marionette.CompositeView.extend({
		emptyView: Details.EmptyView,
		itemView: Details.ItemView,
		itemViewContainer: "div.carousel-inner",
		template: "#set-details-collection",
		events: {
			"click a.carousel-control": "cycleCarousel",
			"click button.learn": "learnClicked",
			"click button.play-meteor": "playMeteor",
			"click a.btn-editCard": "editClicked"
		},
		playMeteor: function(ev) {
			App.trigger("play:meteor", this.model.get("id"));
		},
		editClicked: function(ev) {
			ev.preventDefault();
			console.log("edit clicked" + this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("_id"));
			App.trigger("set:details:edit", this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("_id"));
		},
		cycleCarousel: function(ev) {
			ev.preventDefault();

			if($(ev.currentTarget).hasClass("left")) {
				this.$el.find(":first-child").carousel("prev");
			} else if($(ev.currentTarget).hasClass("right")) {
				this.$el.find(":first-child").carousel("next");
			}
		},
		learnClicked: function(ev) {
			App.trigger("set:learn", this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("_id"));
		},
		onRender: function() {
			if(this.collection.length == 0) this.$el.find("a.carousel-control").hide();
			
			this.$el.find("div.item").first().addClass("active");

			var pickerContainer = this.$el.find("ol.carousel-indicators").first();
			for(var i = 0; i < this.collection.length; i++) {
				var indicatorElem = $("<li></li>").attr("data-slide-to", i);
				if(i === 0) indicatorElem.addClass("active");	

				pickerContainer.append(indicatorElem);
			}

			this.$el.find(':first-child').carousel({ interval: false });
		}
	});
});