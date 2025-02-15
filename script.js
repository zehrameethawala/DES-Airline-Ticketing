// Navigation handling
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Reinitialize chart if showing simulation
    if(sectionId === 'simulation' && currentChart) {
        currentChart.update();
    }
}

// Initialize with home section
document.addEventListener('DOMContentLoaded', () => {
    showSection('home');
});


class Event {
    constructor(time, type) {
        this.time = time;
        this.type = type;
    }
}

class EventQueue {
    constructor() {
        this.events = [];
    }

    empty() {
        return this.events.length === 0;
    }

    add(event) {
        const index = this.events.findIndex(e => e.time > event.time);
        if (index === -1) {
            this.events.push(event);
        } else {
            this.events.splice(index, 0, event);
        }
    }

    removeNextEvent() {
        return this.events.shift() || null;
    }
}

let currentChart = null;

function runSimulation() {
    // Clear previous chart
    if (currentChart) {
        currentChart.destroy();
    }

    // Get and validate inputs
    const numAgents = parseInt(document.getElementById('agents').value);
    const arrivalInput = document.getElementById('arrivals').value;
    
    // Parse arrival times
    const arrivalTimes = arrivalInput.split(',')
        .map(t => parseInt(t.trim()))
        .filter(t => !isNaN(t) && t >= 0)
        .sort((a, b) => a - b);

    if (arrivalTimes.length === 0) {
        alert('Please enter valid arrival times (e.g., "0,5,10,15")');
        return;
    }

    // Initialize simulation
    const eventQueue = new EventQueue();
    const waitingLine = [];
    const waitTimes = [];
    let busyAgents = 0;
    const simulationLog = [];
    const totalCustomers = arrivalTimes.length;

    // Create arrival events
    arrivalTimes.forEach(time => {
        eventQueue.add(new Event(time, 'customer-arrival'));
    });

    // Process events
    let customerCounter = 0;
    while (!eventQueue.empty()) {
        const event = eventQueue.removeNextEvent();
        
        if (event.type === 'customer-arrival') {
            customerCounter++;
            if (busyAgents < numAgents) {
                busyAgents++;
                eventQueue.add(new Event(event.time + 3, 'transaction-complete'));
                waitTimes.push(0);
                simulationLog.push(`🕒 ${event.time}min: Customer ${customerCounter} arrived and served immediately`);
            } else {
                waitingLine.push({ arrivalTime: event.time, customerId: customerCounter });
                simulationLog.push(`🕒 ${event.time}min: Customer ${customerCounter} arrived and joined queue`);
            }
        } else if (event.type === 'transaction-complete') {
            if (waitingLine.length > 0) {
                const customer = waitingLine.shift();
                const waitTime = event.time - customer.arrivalTime;
                waitTimes.push(waitTime);
                eventQueue.add(new Event(event.time + 3, 'transaction-complete'));
                simulationLog.push(`✅ ${event.time}min: Customer ${customer.customerId} served after ${waitTime}min wait`);
            } else {
                busyAgents--;
                simulationLog.push(`🆓 ${event.time}min: Agent freed`);
            }
        }
    }

    // Update UI
    const averageWait = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length || 0;
    document.getElementById('stats').innerHTML = `
        <p>Total Customers: ${totalCustomers}</p>
        <p>Average Wait Time: ${averageWait.toFixed(1)} minutes</p>
        <p>Max Wait Time: ${Math.max(...waitTimes, 0)} minutes</p>
        <p>Agents Utilized: ${numAgents}</p>
    `;

    document.getElementById('log').innerHTML = simulationLog
        .map(entry => `<div class="log-entry">${entry}</div>`)
        .join('');

    // Create chart
    const ctx = document.getElementById('waitTimeChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: totalCustomers}, (_, i) => `Customer ${i + 1}`),
            datasets: [{
                label: 'Wait Time (minutes)',
                data: waitTimes,
                backgroundColor: '#3498db',
                borderColor: '#2c3e50',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Minutes' }
                },
                x: { display: false }
            },
            plugins: {
                legend: { display: false },
                tooltip: { 
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: (items) => `Customer ${items[0].dataIndex + 1}`,
                        label: (context) => `Wait time: ${context.parsed.y} minutes`
                    }
                }
            }
        }
    });
}