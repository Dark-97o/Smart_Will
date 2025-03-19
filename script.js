// SmartWill Platform JavaScript

// Global variables
let currentAccount = null;

// Connect to Welldone wallet
async function connectWallet() {
    try {
        if (!window.welldone) {
            showMessage("Please install the Welldone wallet extension", "error");
            return null;
        }
        await window.welldone.connect();
        const account = await window.welldone.account();
        currentAccount = account;
        updateWalletStatus(account);
        return account;
    } catch (error) {
        showMessage("Failed to connect wallet: " + error.message, "error");
        return null;
    }
}

// Update wallet connection status in UI
function updateWalletStatus(account) {
    const walletStatus = document.getElementById("wallet-status");
    if (walletStatus) {
        if (account) {
            // Truncate address for display
            const shortAddress = account.address.slice(0, 6) + '...' + account.address.slice(-4);
            walletStatus.innerHTML = `Connected: ${shortAddress}`;
            walletStatus.classList.add("connected");
        } else {
            walletStatus.innerHTML = "Wallet Not Connected";
            walletStatus.classList.remove("connected");
        }
    }
}

// Create a new will
async function createWill() {
    const account = await connectWallet();
    if (!account) return;
    
    const beneficiary = document.getElementById("beneficiary").value;
    const amount = parseFloat(document.getElementById("amount").value);
    
    if (!isValidAddress(beneficiary)) {
        showMessage("Please enter a valid beneficiary address", "error");
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showMessage("Please enter a valid amount", "error");
        return;
    }
    
    try {
        // Convert APT amount to octas (1 APT = 10^8 octas)
        const amountInOctas = Math.floor(amount * 100000000);
        
        const transaction = {
            type: "entry_function_payload",
            function: "MyModule::SmartWill::create_will",
            type_arguments: [],
            arguments: [beneficiary, amountInOctas.toString()]
        };
        
        showMessage("Please confirm the transaction in your wallet...", "pending");
        const pendingTransaction = await window.welldone.signAndSubmitTransaction(transaction);
        
        showMessage("Will created successfully! Transaction hash: " + 
                   pendingTransaction.hash, "success");
        
        // Clear the form
        document.getElementById("beneficiary").value = "";
        document.getElementById("amount").value = "";
        
        // Refresh will list if on manage tab
        if (document.getElementById("manage-section").classList.contains("active")) {
            loadWills();
        }
        
    } catch (error) {
        showMessage("Failed to create will: " + error.message, "error");
    }
}

// Claim inheritance
async function claimInheritance() {
    const account = await connectWallet();
    if (!account) return;
    
    const ownerAddress = document.getElementById("owner-address").value;
    
    if (!isValidAddress(ownerAddress)) {
        showMessage("Please enter a valid owner address", "error");
        return;
    }
    
    try {
        const transaction = {
            type: "entry_function_payload",
            function: "MyModule::SmartWill::claim_inheritance",
            type_arguments: [],
            arguments: [ownerAddress]
        };
        
        showMessage("Please confirm the transaction in your wallet...", "pending");
        const pendingTransaction = await window.welldone.signAndSubmitTransaction(transaction);
        
        showMessage("Claim submitted successfully! Transaction hash: " + 
                   pendingTransaction.hash, "success");
        
        // Clear the form
        document.getElementById("owner-address").value = "";
        
    } catch (error) {
        showMessage("Failed to claim inheritance: " + error.message, "error");
    }
}

// Load user's wills
async function loadWills() {
    const account = await connectWallet();
    if (!account) return;
    
    const willListElement = document.getElementById("will-list");
    willListElement.innerHTML = "<p class='loading'>Loading your wills...</p>";
    
    try {
        // Here you would make a call to the blockchain to get the user's wills
        // This is a placeholder as we would need to implement view functions or indexer queries
        
        // Example of how to query resources from the account
        const response = await fetch(`https://fullnode.mainnet.aptoslabs.com/v1/accounts/${account.address}/resources`);
        const resources = await response.json();
        
        // Look for Will resources
        const wills = [];
        for (const resource of resources) {
            if (resource.type.includes("SmartWill")) {
                // Parse the resource data based on your contract structure
                wills.push({
                    beneficiary: resource.data.beneficiary,
                    amount: parseInt(resource.data.amount) / 100000000 // Convert octas to APT
                });
            }
        }
        
        // Display wills or show message if none found
        if (wills.length > 0) {
            willListElement.innerHTML = "";
            wills.forEach((will, index) => {
                const willItem = document.createElement("div");
                willItem.className = "transaction-item";
                willItem.innerHTML = `
                    <h3>Will #${index + 1}</h3>
                    <p><strong>Beneficiary:</strong> ${will.beneficiary}</p>
                    <p><strong>Amount:</strong> ${will.amount.toFixed(8)} APT</p>
                `;
                willListElement.appendChild(willItem);
            });
        } else {
            willListElement.innerHTML = "<p>No wills found for your account.</p>";
        }
    } catch (error) {
        willListElement.innerHTML = `<p class="error">Error loading wills: ${error.message}</p>`;
    }
}

// Display messages
function showMessage(message, type) {
    const messageElement = document.getElementById("message");
    if (!messageElement) return;
    
    messageElement.textContent = message;
    
    // Remove all classes and add the new one
    messageElement.className = "";
    messageElement.classList.add(type);
    
    // Scroll to message
    messageElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    
    // Clear success/info messages after 5 seconds
    if (type === "success" || type === "info") {
        setTimeout(() => {
            if (messageElement.textContent === message) {
                messageElement.textContent = "";
                messageElement.className = "";
            }
        }, 5000);
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Hide all tab contents
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }
    
    // Remove active class from all tabs
    const tabs = document.getElementsByClassName("tab");
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("active");
    }
    
    // Show the selected tab content
    document.getElementById(tabName + "-section").classList.add("active");
    
    // Set the clicked tab as active
    const clickedTab = document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`);
    if (clickedTab) {
        clickedTab.classList.add("active");
    }
    
    // Load appropriate data for the tab
    if (tabName === "manage") {
        loadWills();
    }
}

// Validate Welldone address
function isValidAddress(address) {
    if (!address || address.trim() === "") return false;
    
    // Assuming Welldone uses the same address format as Aptos
    // If not, update the regex accordingly
    const regex = /^0x[a-fA-F0-9]{64}$/;
    return regex.test(address);
}

// Initialize the app
function initApp() {
    // Add event listeners
    document.addEventListener("DOMContentLoaded", function() {
        // Try to connect wallet automatically
        connectWallet().then(account => {
            if (account) {
                console.log("Wallet connected automatically");
            }
        });
        
        // Add connect wallet button listener if it exists
        const connectButton = document.getElementById("connect-wallet");
        if (connectButton) {
            connectButton.addEventListener("click", connectWallet);
        }
    });
}

// Start the app
initApp();