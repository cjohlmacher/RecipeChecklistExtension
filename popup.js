var backgroundPage = chrome.extension.getBackgroundPage();

//Insert button for email link.
	var emailNode = document.createElement("a");
	emailNode.setAttribute("rel","no-follow");
	emailNode.setAttribute("target","_blank");
	var emailButton = document.createElement("INPUT");
	emailButton.setAttribute("type","button");
	emailButton.setAttribute("id","email-button");
	emailNode.prepend(emailButton);
	emailButton.addEventListener('click', function(event) {
		console.log("Email button clicked");
		var recipeText = createRecipeText();
		emailNode.setAttribute("href","mailto:?subject=Recipe+CheckList&body="+recipeText);
		emailNode.click();
	});
	document.getElementById('email-header').appendChild(emailNode);

//Create email body text based off ingredient list
const createRecipeText = () => {
	var recipeText = ''
		for (key in backgroundPage.ingredientList) {
			for (let i = 0; i< backgroundPage.ingredientList[key].length; i++) {
				var recipeText = recipeText + backgroundPage.ingredientList[key][i] + '%0D%0A'
			}
		}
	return recipeText
}

//Prepend checkbox to ingredient
const prependCheckbox = (node,tabId,key) => {
	var checkbox = document.createElement("INPUT");
	checkbox.setAttribute("type","checkbox");
	checkbox.setAttribute("id","popUpCheckbox");
	node.prepend(checkbox);
	checkbox.tabId = tabId;
	checkbox.addEventListener('click', function(event) {
		event.currentTarget.parentNode.style.textDecoration = "line-through";
		removableTarget = event.currentTarget
		//Sync with open tab on browswer
		if (tabId !== undefined) {
			chrome.tabs.sendMessage(this.tabId, {ingredient: removableTarget.parentNode.textContent});
			var ingredientIndex = backgroundPage.ingredientList[key].indexOf(removableTarget.parentNode.textContent);
			if (ingredientIndex !== -1) {
				backgroundPage.ingredientList[key].splice(ingredientIndex,1);
			}
		} else {
			var ingredientIndex = backgroundPage.ingredientList[["Your Additional Ingredients","000",3]].indexOf(removableTarget.parentNode.textContent);
			if (ingredientIndex !== -1) {
				backgroundPage.ingredientList[["Your Additional Ingredients","000",3]].splice(ingredientIndex,1);
			}
		}
		window.setTimeout(function() { removableTarget.parentNode.remove(); }, 100);
		console.log(backgroundPage.ingredientList);
	});
}

//Prepend button to recipe
const prependButton = (node,key) => {
	var button = document.createElement("INPUT");
	button.setAttribute("type","button");
	button.setAttribute("id","titleButton");
	node.prepend(button);
	button.addEventListener('click', function(event) {
		chrome.runtime.sendMessage(["removeRecipe",key]);
		console.log(event.currentTarget.parentNode.parentNode);
		event.currentTarget.parentNode.nextElementSibling.remove();
		event.currentTarget.parentNode.remove();
		console.log(backgroundPage.ingredientList);
	});
};


//Load recipes
for (key in backgroundPage.ingredientList) {
	console.log(key);
	
	//Set up Ingredient List key variables
	var tabIdSize = key[key.length-1];
	var tabTitle = key.slice(0,key.length-tabIdSize-3);
	var tabId = parseInt(key.slice(key.length-tabIdSize-2,key.length),10);

	//Insert headers for each recipe with button to delete recipe if not wanted
	var titleNode = document.createElement("h1");
	var titleTextNode = document.createTextNode(tabTitle);
	titleNode.appendChild(titleTextNode);
	var ulNode = document.createElement("list");
	ulNode.setAttribute("id","ingredientsUl"+tabId.toString());
	if (tabId != '000') {
		prependButton(titleNode,key);
		document.getElementById('ingredients').appendChild(titleNode);
		document.getElementById('ingredients').appendChild(ulNode);
	} else {
		document.getElementById('additional-ingredients').prepend(titleNode);
	}
	
	//Insert each ingredient and its checkbox
	for (ingredient in backgroundPage.ingredientList[key]) {
		var node = document.createElement("li");
		var textNode = document.createTextNode(backgroundPage.ingredientList[key][ingredient]);
		node.appendChild(textNode);
		prependCheckbox(node,tabId,key);
		if (tabId != '000') {
			document.getElementById('ingredientsUl'+tabId.toString()).appendChild(node);
		} else {
			document.getElementById('additional-ingredientsUl').appendChild(node);
		}
	}
}

//Insert section for adding/displaying user's custom ingredients
var customNode = document.createElement("h1");
var customTextNode = document.createTextNode("Add Ingredient:");
customNode.appendChild(customTextNode);
var customInput = document.createElement("INPUT");
customInput.setAttribute("type","text");
customInput.setAttribute("id","custom-ingredients");
customNode.append(customInput);
customInput.addEventListener('keydown', function(event) {
	console.log("keypress")
	if (event.keyCode === 13) {
		var customListItem = document.createElement("li");
		var customIngredient = customInput.value;
		customInput.value = "";
		var customIngredientTextNode = document.createTextNode(customIngredient) 
		customListItem.append(customIngredientTextNode);
		prependCheckbox(customListItem,undefined,undefined);
		chrome.runtime.sendMessage(["newItem",customIngredient,'000','Your Additional Ingredients']);
		document.getElementById('additional-ingredientsUl').append(customListItem);
		window.scrollBy(0,1000);
	} 
});
document.getElementById('additional-ingredients').appendChild(customNode);
