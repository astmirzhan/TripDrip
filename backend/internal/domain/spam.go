package domain

import (
	"regexp"
	"strings"
)

var (
	pricePattern = regexp.MustCompile(`(?i)(\d+\s*(тг|тенге|kzt|\$|usd|eur|руб|₽)|(\$|€|₽)\s*\d+)`)
	linkPattern  = regexp.MustCompile(`(?i)(https?://|www\.|t\.me/|wa\.me/|instagram\.com/|whatsapp\.com/)`)
	phoneInMsg   = regexp.MustCompile(`(\+?7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}`)
	promoWords   = []string{
		"оплата на карту", "перевод на каспи", "kaspi", "предоплата",
		"прайс", "платная экскурсия", "бронируй", "скидка", "заказать тур",
	}
)

// IsCommercialSpam scans chat messages for prices, external commercial links, phone numbers, or solicitation.
func IsCommercialSpam(text string) bool {
	if pricePattern.MatchString(text) || linkPattern.MatchString(text) || phoneInMsg.MatchString(text) {
		return true
	}
	lower := strings.ToLower(text)
	for _, kw := range promoWords {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}
