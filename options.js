// Load saved settings
chrome.storage.sync.get({
  startTime: '08:00',
  endTime: '17:00',
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  passCount: 0
}, function(items) {
  document.getElementById('startTime').value = items.startTime;
  document.getElementById('endTime').value = items.endTime;
  items.days.forEach(day => {
    document.getElementById(day).checked = true;
  });
  document.getElementById('passCount').textContent = `Passes used today: ${items.passCount}`;
});

// Save settings
document.getElementById('save').addEventListener('click', function() {
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    .filter(day => document.getElementById(day).checked);

  chrome.storage.sync.set({
    startTime: startTime,
    endTime: endTime,
    days: days
  }, function() {
    alert('Settings saved');
  });
});

// Reset pass count
document.getElementById('resetPass').addEventListener('click', function() {
  chrome.storage.sync.set({passCount: 0}, function() {
    document.getElementById('passCount').textContent = 'Passes used today: 0';
    alert('Pass count reset');
  });
});