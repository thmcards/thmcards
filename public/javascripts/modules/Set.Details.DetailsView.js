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
			"click button.memo": "memoClicked",
			"click button.play-meteor": "playMeteor",
			"click a.btn-editCard": "editClicked",
			"click a.btn-deleteCard": "deleteClicked"
		},
		playMeteor: function(ev) {
			App.trigger("play:meteor", this.model.get("id"));
		},
		editClicked: function(ev) {
			ev.preventDefault();

			//cardid holen
			var cardId = $("div.item.active").children(".box").attr("data-id");

			App.trigger("set:details:edit", this.model.get("_id"), cardId);
		},
		deleteClicked: function(ev) {
			ev.preventDefault();
			var cardId = $("div.item.active").children(".box").attr("data-id");

			var actualCard = this.collection.get(cardId);
			console.log(this.collection);
			actualCard.destroy({
			    success : function(resp){
			    	console.log("card deleted");
			    },
			    error : function(err) {
			        console.log('error callback');
			        // this error message for dev only
			        alert('There was an error. See console for details');
			        console.log(err);
				}
			});
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
			App.trigger("set:learn", this.model.get("_id"));
		},
		memoClicked: function(ev) {
			App.trigger("set:memo", this.model.get("_id"));
		},
		onRender: function() {

			if(this.collection.length == 0) {
				this.$el.find("a.carousel-control").hide();
				this.$el.find("button.play-meteor").prop('disabled', true);
				this.$el.find("button.learn").prop('disabled', true);
				this.$el.find("button.memo").prop('disabled', true);
			}
			
			this.$el.find("div.item").first().addClass("active");

			var pickerContainer = this.$el.find("ol.carousel-indicators").first();
			for(var i = 0; i < this.collection.length; i++) {
				var indicatorElem = $("<li></li>").attr("data-slide-to", i);
				if(i === 0) indicatorElem.addClass("active");	

				pickerContainer.append(indicatorElem);
			}

			this.$el.find(':first-child').carousel({ interval: false });

			$('#btnToCardLayout').addClass("active");
			$('#btnToListLayout').removeClass("active");

			var usr = $.cookie('usr');
			$("#usr-name").text();
			$.get("/score/"+usr.username+"/"+this.model.get("_id"), function( data ) {
				$("#meteor-set-points").text(data.score);
			}).fail(function(){
				console.log("yeah");
			});
		},
		onShow: function() {
		var that = this;
		var tweak = 200;

		    $.fn.resizeText = function(){
		      var size = parseInt($(this).css("fontSize"));
		      var html = $(this).html();
		      var textLength = html.length;
		      var span = "<span style='display:none'>" + html + "</span>";
		      that.$el.append(span);
		      var width = that.$el.find('span:last').width();
		      console.log(that.$el.find('span:last'));
		      console.log(width);
		      console.log($(this).width());
		      var newSize = ($(this).width()-tweak)/(width)*size;
		      console.log(newSize);
		      if (newSize < "45"){
		      	console.log("edited size enabled");
		      	$(this).css("fontSize", newSize);
		      }
		      return width;
		    };

		    this.$el.find("div.front").resizeText();
		}
	});

	Details.ListItem = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
	    template: "#set-details-listitem"
	});

	Details.ListEmptyView = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
		template: "#set-details-listitem-empty",
		className: "empty-listitem"
	});	

	Details.DetailsListView = Backbone.Marionette.CompositeView.extend({
		emptyView: Details.ListEmptyView,
		tagName: "table",
		className: "table table-bordered table-striped table-hover",
		itemView: Details.ListItem,
		itemViewContainer: "tbody",
		template: "#set-details-list",
		events: {
			"click a.btn-listEditCard": "editClicked",
			"click a.btn-listDeleteCard": "deleteClicked"
		},
		editClicked: function(ev) {
			ev.preventDefault();

			var cardId = $(ev.currentTarget).attr("data-id")
			App.trigger("set:details:edit", this.model.get("_id"), cardId);
		},
		deleteClicked: function(ev) {
			ev.preventDefault();
			var cardId = $(ev.currentTarget).attr("data-id")

			var actualCard = this.collection.get(cardId);
			console.log(this.collection);
			actualCard.destroy({
			    success : function(resp){
			    	console.log("card deleted");
			    },
			    error : function(err) {
			        console.log('error callback');
			        // this error message for dev only
			        alert('There was an error. See console for details');
			        console.log(err);
				}
			});
		},
		onRender: function(ev) {
			$('#btnToListLayout').addClass("active");
			$('#btnToCardLayout').removeClass("active");
		}
	});
});