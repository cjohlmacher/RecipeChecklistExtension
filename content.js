
//Function for evaluating if output of text node is undefined, empty, or just whitespace
const isEmpty = str => {
	return (!str || str.length === 0 || undefined || /^\s*$/.test(str) || /^\n\s*$/.test(str))
}

//Function for prepending a checkbox before an HTML element
const prependCheckbox = htmlElement => {
	var newItem = false;
	if (isEmpty(htmlElement.firstElementChild) === false) {
		if (htmlElement.firstElementChild.className === 'ingredientsCheckbox') {
		} else {
			newItem = true;
		}
	} else {
		newItem = true;
	}

	if (newItem === true) {
		var checkbox = document.createElement("INPUT");
		checkbox.setAttribute("type","checkbox");
		checkbox.setAttribute("id","ingredientsChecklist");
		checkbox.setAttribute("class","ingredientsCheckbox");
		htmlElement.prepend(checkbox); 
		var ingredient = htmlElement.textContent; //replace with innerText?
		chrome.runtime.sendMessage(["newItem",ingredient]);
		checkbox.addEventListener('click', function cb(event) {
			if (event.currentTarget.parentNode.style.textDecoration === "line-through") {
				event.currentTarget.parentNode.style.textDecoration = "none";
				chrome.runtime.sendMessage(["clickOff",event.currentTarget.parentNode.textContent]);
			} else {
				event.currentTarget.parentNode.style.textDecoration = "line-through";
				chrome.runtime.sendMessage(["clickOn",event.currentTarget.parentNode.textContent]);
			}
		});
	}
};

//Function for taking a JQuery result and evaluating whether each item is an ingredient.  If so, it calls the prependCheckbox function.
const ingredientSearch = ingredients => {
	console.log(ingredients);
	initiatePopUp();
	var layerFound = false;
	for (let i = 0; i< ingredients.length; i++) {
		var topText = ""

		//Check if queried result is in a nutritional information section:
		if (ingredients[i].parentNode.className !== null) {
			parentClassName = ingredients[i].parentNode.className
		}
		if (ingredients[i].parentNode.parentNode.className !== null) {
			grandparentClassName = ingredients[i].parentNode.parentNode.className;
		}
		if (parentClassName.includes('utrition') || grandparentClassName.includes('utrition')) {
			continue;
		}

		//Check if queried result is part of an ordered list (i.e. preparation steps):
		if (ingredients[i].parentNode.tagName === "OL") {
			continue;
		}

		//Find text content of query result.
		for (let j=0; j<ingredients[i].childNodes.length; j++) {
			if (isEmpty(ingredients[i].childNodes[j].textContent) === false) {
				topText = topText + ingredients[i].childNodes[j].textContent
			} 
		};
		
		//Do checks to see if query result may be a container for several ingredients.
		var suspectContainer = false; 
		var maxIngredientLength = 200;
		if (isEmpty(ingredients[i].className) === false && isEmpty(ingredients[i].nextElementSibling) === false) {
			if (ingredients[i].className !== ingredients[i].nextElementSibling.className) {
				suspectContainer = true;
			}
		} else if (topText.length > maxIngredientLength) {
			suspectContainer = true;
		}

		//Decide how to handle query result: discard, search deeper, or add to ingredient list
		if (ingredients[i].textContent.includes("gredient") || ingredients[i].textContent.endsWith(":")) {
		} else if (isEmpty(topText) === true || suspectContainer === true) {
			var newIngredients = [];
			for (let k=0; k<ingredients[i].childNodes.length; k++) {
				newIngredients.push(ingredients[i].childNodes[k]);
			}
			if (newIngredients.length > 0) {
				ingredientSearch(newIngredients);	
			};

		} else {
			tagList(ingredients[i]);
			prependCheckbox(ingredients[i])
			layerFound = true;
		};
	};
	return layerFound;
};


const runQuery = () => {
	//JQuery queries to locate ingredients list on a webpage.
	var ingredients = document.getElementsByClassName('ingredient');
	var ingredientsUl = $("ul[class*='gredient']").find("li")
	var ingredientsDiv = $("div[class*='gredient']").find("li")
	var ingredientsSection = $("section[class*='gredient']").find("li")
	var ingredientsDivWrap = $("div[class*='gredient']")
	var ingredientsDivSpans = $("div[class*='gredient']").find("span, p")
	var ingredientsP = $("p[class*='gredient']")
	var ingredientsInHeader = $("header:contains('Ingredients')").closest("div").find("li")
	var ingredientsInSpan = $("span:contains('Ingredients')").closest("div").find("li")

	//Prioritization for the above queries.  
	var queryPriority = [ingredientsUl,ingredientsDiv,ingredientsSection,ingredientsDivWrap, ingredientsDivSpans,ingredientsP, ingredientsInHeader, ingredientsInSpan]
	
	//While loop to run through query priority queue.  If ingredientSearch on a query returns a result, the subsequent query results in the queue are not looked at.
	var foundQuery = false
	var index = 0

	while (foundQuery === false && index < queryPriority.length) {
		if (queryPriority[index].length > 0) {
			console.log(queryPriority[index])
			var queryResult = ingredientSearch(queryPriority[index]);
			console.log(queryResult);
			if (queryResult === true) {
				foundQuery = true;
				addStrikethroughListener();
			}
			index = index + 1;
		} else {
			index = index + 1
		};
	};

	//Final catch-all criteria may be added to enable page action for the tab:
	/*
	if () {
		initiatePopUp()
	}
	*/
};


//Sends message to enable page action for the active tab.
const initiatePopUp = () => {
	chrome.runtime.sendMessage(["initializeTab", null]);
}

//Tags the parentNode for CSS formatting.
const tagList = (target) => {
	if (target.tagName === 'LI') {
		target.setAttribute("id","ingredientsChecklistUl")
	}
	if (target.parentNode.tagName === 'UL' || target.parentNode.tagName === 'LI') {
		target.parentNode.setAttribute("id","ingredientsChecklistUl")
	}
	if (target.parentNode.parentNode.tagName === 'UL' || target.parentNode.tagName === 'LI') {
		target.parentNode.parentNode.setAttribute("id","ingredientsChecklistUl")
	} 
}

//Function to add listener so that when an ingredient is checked off from the Popup it can be removed on the content page as well.
const addStrikethroughListener = () => {
	console.log("strikethrough listener added");
	chrome.runtime.onMessage.addListener(function(request,sender,sendResponse) {
		console.log(sender.tab ?
			"from a content script:" + sender.tab.url : request);
		if (request["ingredient"] !== undefined) {
			ingredientCheckOff(request["ingredient"])
		}
		return true;
	});
};

//Function to check-off an ingredient on the content page.
const ingredientCheckOff = (ingredient) => {
	var ingredientsUl = $(".ingredientsCheckbox").parent(":contains("+ingredient+")").children(".ingredientsCheckbox");
	for (let i = 0; i< ingredientsUl.length; i++) {
		ingredientsUl[i].click();
	}
}

//window.setTimeout(function() { runQuery(); }, 5000);
runQuery();

