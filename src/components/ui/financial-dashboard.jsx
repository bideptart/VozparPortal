import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, History, Library, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- HELPER COMPONENTS ---
const IconWrapper = ({ icon: Icon, className }) => (
  <div className={cn('p-2 rounded-full flex items-center justify-center', className)}>
    <Icon className="w-5 h-5" />
  </div>
);

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

// --- MAIN COMPONENT ---
// Generic "financial dashboard" shell: search bar + quick actions grid +
// recent-activity list + a services/links list. Content is entirely
// prop-driven so any billing-style surface can plug its own data in.
export const FinancialDashboard = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  quickActions = [],
  activityLabel = 'Recent activity',
  recentActivity = [],
  servicesLabel = 'Financial services',
  financialServices = [],
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-card text-card-foreground rounded-2xl border shadow-sm w-full font-sans"
    >
      <div className="p-4 md:p-6">
        {/* Search Bar */}
        <motion.div variants={itemVariants} className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="input pl-10 pr-4"
          />
        </motion.div>

        {/* Quick Actions Grid */}
        {quickActions.length > 0 && (
          <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {quickActions.map((action, index) => (
              <motion.button
                type="button"
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.onClick}
                disabled={!action.onClick}
                className={cn(
                  'group appearance-none text-center p-3 rounded-xl transition-colors bg-muted hover:bg-white/10 border border-transparent hover:border-border disabled:opacity-100',
                  action.onClick ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <IconWrapper icon={action.icon} className={cn('mx-auto mb-2 bg-muted', action.iconClassName)} />
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{activityLabel}</h2>
            </div>
            <motion.ul variants={containerVariants} className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {recentActivity.map((activity, index) => (
                <motion.li key={activity.id ?? index} variants={itemVariants} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {React.isValidElement(activity.icon) ? (
                      activity.icon
                    ) : (
                      <IconWrapper icon={activity.icon} className={cn('bg-muted text-muted-foreground', activity.iconClassName)} />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.time}</p>
                    </div>
                  </div>
                  {activity.badge}
                  {activity.amountLabel !== undefined && (
                    <div
                      className={cn(
                        'text-sm font-mono p-1 px-2 rounded shrink-0',
                        activity.tone === 'negative'
                          ? 'text-red-400 bg-red-500/10'
                          : 'text-lime-400 bg-lime-500/10',
                      )}
                    >
                      {activity.amountLabel}
                    </div>
                  )}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}

        {/* Financial Services */}
        {financialServices.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-4">
              <Library className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{servicesLabel}</h2>
            </div>
            <motion.div variants={containerVariants} className="space-y-2">
              {financialServices.map((service, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ scale: 1.015 }}
                  onClick={service.onClick}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl transition-all bg-transparent hover:bg-muted',
                    service.onClick ? 'cursor-pointer' : 'cursor-default',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconWrapper icon={service.icon} className="bg-muted-foreground/10" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm flex items-center gap-2">
                        {service.title}
                        {service.isPremium && (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {service.isPremium}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                    </div>
                  </div>
                  {service.hasAction && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default FinancialDashboard;
