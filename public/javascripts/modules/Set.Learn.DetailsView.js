Cards.module('Set.Learn', function(Learn, App) {
	Learn.ItemView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-item",
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
	Learn.EmptyView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-item-empty",
		className: "empty-item"
	});

	Learn.DetailsView = Backbone.Marionette.CompositeView.extend({
		emptyView: Learn.EmptyView,
		itemView: Learn.ItemView,
		itemViewContainer: "div.carousel-inner",
		template: "#set-learn-collection",
		events: {
			"click a.carousel-control": "cycleCarousel",
			"click button.card-success": "cardSuccess",
			"click button.card-fail": "cardFail"
		},
		cycleCarousel: function(ev) {
		ev.preventDefault();
		console.log($(ev.currentTarget));

			if($(ev.currentTarget).hasClass("left")) {
				this.$el.find(":first-child").carousel("prev");
			} else if($(ev.currentTarget).hasClass("right")) {
				this.$el.find(":first-child").carousel("next");
			}
		},
		giveAnswer: function(ev) {
		ev.preventDefault();


			if($(ev.currentTarget).hasClass("left")) {
				this.$el.find(":first-child").carousel("prev");
			} else if($(ev.currentTarget).hasClass("right")) {
				this.$el.find(":first-child").carousel("next");
			}

		},
		cardSuccess: function(ev) {
			var cardId = $("div.item.active").children(".box").attr("data-id");
			var boxId = $("div.item.active").children(".box").attr("data-boxId");
			
			this.$el.find(":first-child").carousel("next");

			var boxBefore = boxId;

			if (boxId < 5) {
				boxId++;
			} else {
				boxId == 5;
			}
			this.saveCard(cardId, boxId);
			console.log("box", boxId);

			

			if($("div.item.active").children(".box").attr("data-id") == $("div.item").children(".box").last().attr("data-id")) {
					App.trigger("filter:box", boxBefore);
					this.renderModel();

					console.log("cleaned. box:" + boxBefore);
			}


			


			console.log($("div.item.active").children(".box").attr("data-id"));

		},
		cardFail: function(ev) {

			var cardId = $("div.item.active").children(".box").attr("data-id");
			var boxId = $("div.item.active").children(".box").attr("data-boxId");

			var boxBefore = boxId;

			boxId = 1;
			console.log(boxId);



			this.$el.find(":first-child").carousel("next");


			console.log($("div.item.active").children(".box").attr("data-id"));

			this.saveCard(cardId, boxId);

			if($("div.item.active").children(".box").attr("data-id") == $("div.item").children(".box").last().attr("data-id")) {
					App.trigger("filter:box", boxBefore);
					console.log("cleaned. box:" + boxBefore);
			}



		},
		saveCard: function(cardId, boxId) {
			var model = this.collection.get(cardId);

			console.log("model", model);
			if(model.has("persCard")) {
				console.log("has persCard");
				var persCard = _.first(model.get("persCard"));
				persCard.value.box = boxId;
				
				model['persCard'] = persCard;
				model.set({persCard: persCard});

				console.log("newPers", persCard);
			} else {
				console.log("bla");
				var personalcard = new Cards.Entities.Personalcard({ 
						cardId: cardId,
						box: boxId
				});
				console.log(personalcard.parse());
			}

			/*this.collection.create(model, {
			    wait : true,    // waits for server to respond with 200 before adding newly created model to collection

			    success : function(resp){
			        
			    },
			    error : function(err) {
			    	alert('There was an error. See console for details');
			        console.log(err);
				}
			});*/
			var that = this;
			model.save().then(function(){
				//that.render();
				App.trigger("filter:box", boxId-1);
				$("div.item").children(".box").attr("data-boxId", boxId-1);
			});



			/*var personalcard = new Cards.Entities.Personalcard({ 
						cardId: cardId,
						box: boxId
			});
			personalcard.save();
			this.collection.fetch()*/
		},

		initialize: function() {
			var that = this;
			App.on('filter:box', function(boxId) {
				that.filterBox(boxId);
			})
		},
		filterBox: function(boxId) {
			console.log(this.collection);
			if(boxId != null) {
				this.collection.filter(boxId);
			} else {
				this.collection.filter();
			}
			console.log(this.collection);

			this.render();
		},
		onRender: function() {
			//if(this.collection.length == 0) this.$el.find("a.carousel-control").hide();
			
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