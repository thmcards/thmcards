Cards.module("Set.Details.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-sideBar",
		className: "well well-sm sidebar-nav",
		events: {
			"click a.btn-cardLayout": "switchToCardLayout",
			"click a.btn-listLayout": "switchToListLayout"
		},
		switchToCardLayout: function(ev) {
			if (!$('#btnToCardLayout').hasClass("active")) {
				App.trigger("set:details", this.model.get("_id"));
			}		
		},
		switchToListLayout: function(ev) {
			if (!$('#btnToListLayout').hasClass("active")) {
				App.trigger("set:detailslist", this.model.get("_id"));
			}
		},
		initialize: function () {
    		_.bindAll(this);
    		this.model.on('change', this.render);
		}
	}),
	SideBar.RatingsView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-rating",
		className: "well well-sm sidebar-nav",
		onRender: function() {
			console.log("ren");
			this.$("#raty").raty({ 
				score: function() {
			      return $(this).attr('data-score');
			    },
			    readonly: true,
				starOff: '/img/star-off.png',
				starOn : '/img/star-on.png',
				starHalf: '/img/star-half.png'
			});
		}
	}),

	SideBar.ControlsView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-controls",
		className: "well well-sm sidebar-nav",
		ui: {
			btnAdd: "a.saveSet", 
			inputSetName: "input[type=text]",
			modalView: "#editSetModal",
			modalBtnSave: "#editSetModal button.btn-primary",
			modalBtnDelete: "#editSetModal button.btn-setDelete",
			modalInputName: "#editSetName",
			modalInputDescription: "#editSetDescription",
			modalInputCategory: "#editSetCategory"

		},
		events: {
			"click .newCard": "newCardClicked",
			"click .editSet": "showEditSetModal",
			"click #editSetModal button.btn-primary": "updateSet",
			"click #editSetModal button.btn-danger": "deleteClicked",
			"click #editSetModal button.btn-warning": "deleteSet",
			"click a.show-rating": "showRatings"
		},
		newCardClicked: function(ev) {
			App.trigger("set:details:new", this.model.get("_id"));
		},
		showEditSetModal: function() {
			var that = this;

			this.ui.modalInputName.val(this.model.get("name"));
			this.ui.modalInputDescription.val(this.model.get("description"));
			this.ui.modalInputCategory.val(this.model.get("category"));
			
			if (this.model.get("visibility") === "public") {
					$("#editSetModal .btn-group > label.private").removeClass("active");
					$("#editSetModal .btn-group > label.public").addClass("active");
			}

			this.ui.modalView.on('hidden.bs.modal', function() {
				that.ui.modalBtnSave.button('reset');
				that.ui.modalInputName.val('');
				that.ui.modalInputDescription.val('');
				that.$('.help-block').text('');
				that.$('.setdetails').removeClass('has-error');

			})
			this.ui.modalView.modal('show');
		},
		updateSet: function(ev) {
			var that = this;
			console.log("updaaaate");

			this.ui.modalBtnSave.button('loading');

			var name = this.ui.modalInputName.val();
			var description = this.ui.modalInputDescription.val();
			var category = this.ui.modalInputCategory.val();
			var visibility = $("#editSetModal .btn-group > label.active > input").val();

			this.model.set({
					name: name, 
					description: description,
					visibility: visibility,
					category: category,
					cardCnt: 0
				 });

			if(this.model.isValid()) {
				this.model.save({},{
				    wait : true,    // waits for server to respond with 200 before adding newly created model to collection
				    success : function(resp){
				        that.ui.modalView.modal('hide');
				    },
				    error : function(err) {
				    	that.ui.modalBtnSave.button('reset');
				        console.log('error callback');
				        // this error message for dev only
				        alert('There was an error. See console for details');
				        console.log(err);
					}
				});
			} else {
				this.showErrors(this.model.validationError);
				this.ui.modalBtnSave.button('reset');
			}
		},
		showErrors: function(errors) {
			console.log("showerrors");
			this.$('.help-block').text('');
			this.$('.setdetails').removeClass('has-error');
		    _.each(errors, function (error) {
		        var cardside = this.$('div.' + error.name);
		        cardside.addClass('has-error');
		        var helptext = this.$('span.' + error.name);
		        helptext.text(error.message);
		    }, this);
		}, 
		hideErrors: function () {
			console.log("hideerrors");
			this.$('.help-block').text('');
			this.$('.setdetails').removeClass('has-error');
		},
		deleteClicked: function(ev) {
			$(".btn-setDelete").removeClass("btn-danger");
			$(".btn-setDelete").text("Sicher?");
			$(".btn-setDelete").addClass("btn-warning");
		},
		resetDeleteButton: function(ev) {
			if ($(".btn-setDelete").hasClass("btn-warning")) {
					$(".btn-setDelete").removeClass("btn-warning");
					$(".btn-setDelete").addClass("btn-danger");
					$(".btn-setDelete").text("Kartensatz löschen");
			}
		},
		deleteSet: function(ev) {
			var that = this;
			this.ui.modalBtnDelete.button('loading');
			this.model.destroy({

			    success : function(resp){
			        that.ui.modalView.modal('hide');
					that.ui.modalView.on('hidden.bs.modal', function() {
					        App.trigger("set:list");
					})
			    },
			    error : function(err) {
			    	that.ui.modalBtnDelete.button('reset');
			        console.log('error callback');
			        // this error message for dev only
			        alert('There was an error. See console for details');
			        console.log(err);
				}
			});
		},
		showRatings: function(ev) {
			ev.preventDefault();
			App.trigger('set:rating', this.model.get("id"));
		},
		onClose: function(){
			console.log("asd");
			$(".btn-setDelete").off('clickout');
		},
		onRender: function(){
			console.log(this.$(".btn-setDelete"));
			this.$(".btn-setDelete").clickout(this.resetDeleteButton);
		}
	});
});