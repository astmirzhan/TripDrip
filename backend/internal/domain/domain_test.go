package domain

import (
	"testing"
	"time"
)

func TestValidateKZNumber12(t *testing.T) {
	// Generate a valid 12-digit IIN/BIN using the official mod-11 rule
	makeValid := func(prefix11 string) string {
		d := make([]int, 11)
		for i := 0; i < 11; i++ {
			d[i] = int(prefix11[i] - '0')
		}
		w1 := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}
		sum := 0
		for i := 0; i < 11; i++ {
			sum += d[i] * w1[i]
		}
		ctrl := sum % 11
		if ctrl == 10 {
			w2 := []int{3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2}
			sum = 0
			for i := 0; i < 11; i++ {
				sum += d[i] * w2[i]
			}
			ctrl = sum % 11
		}
		return prefix11 + string(rune('0'+ctrl))
	}

	valid := makeValid("95041230012")
	if !ValidateKZNumber12(valid) {
		t.Fatalf("expected valid KZ number %s", valid)
	}
	if ValidateKZNumber12("123456789012") {
		t.Fatalf("expected invalid checksum to fail")
	}
	if ValidateKZNumber12("12345") {
		t.Fatalf("expected short number to fail")
	}
}

func TestGeoAndAntifraud(t *testing.T) {
	coord, ok := ResolveCentroid("Almaty", "Medeu")
	if !ok || coord.Lat == 0 || coord.Lng == 0 {
		t.Fatalf("expected centroid for Almaty:Medeu")
	}

	// Distance from Medeu skating rink to Shymbulak is ~3.8 km
	dist := HaversineMeters(43.1575, 77.0589, 43.1281, 77.0804)
	if dist < 3000 || dist > 5000 {
		t.Fatalf("unexpected haversine distance: %f", dist)
	}

	if _, inRange := ValidateCheckinRange(43.1575, 77.0589, 43.1578, 77.0592, 100); !inRange {
		t.Fatalf("expected point within 100m range")
	}
	if _, inRange := ValidateCheckinRange(43.1575, 77.0589, 43.1700, 77.0592, 100); inRange {
		t.Fatalf("expected point outside 100m range")
	}

	now := time.Now()
	// 50 km in 10 seconds = 18,000 km/h -> speed anomaly
	if _, ok := ValidateTravelSpeed(43.2389, 76.8897, now.Add(-10*time.Second), 43.6889, 76.8897, now); ok {
		t.Fatalf("expected speed anomaly rejection")
	}
	// 2 km in 10 minutes = 12 km/h -> valid
	if _, ok := ValidateTravelSpeed(43.2389, 76.8897, now.Add(-10*time.Minute), 43.2550, 76.8897, now); !ok {
		t.Fatalf("expected normal travel speed to pass")
	}
}

func TestSpamScanner(t *testing.T) {
	cases := []struct {
		text string
		spam bool
	}{
		{"Привет! Встретимся у парка Первого Президента в 15:00?", false},
		{"Могу показать город, перевод на каспи 15000 тг", true},
		{"Пиши мне в телеграм https://t.me/fake_guide", true},
		{"Звони на 8 777 123 45 67", true},
		{"I can help translate at the train station!", false},
	}
	for _, tc := range cases {
		if got := IsCommercialSpam(tc.text); got != tc.spam {
			t.Errorf("IsCommercialSpam(%q) = %v, want %v", tc.text, got, tc.spam)
		}
	}
}
